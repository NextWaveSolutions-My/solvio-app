"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import {
  createTicketSchema,
  updateTicketSchema,
  updateCustomizationSchema,
  updateInstallationSchema,
} from "@/lib/validations";
import { verifyPurchaseCode, isPurchaseCodeRequired } from "@/lib/envato";
import { getUserIdsByRole } from "@/lib/user-utils";
import { createBulkNotifications, createNotification } from "@/lib/notifications";
import { notifyAdminsTelegram, toPlainPreview } from "@/lib/telegram/server";
import {
  getKindFromCategory,
  getRequestCollectionName,
  getRequestPaths,
  findRequestById,
} from "@/lib/request-utils";
import { toPlainObject } from "@/lib/serialization";
import { validateTicketCategoryForTicketCreation } from "@/lib/ticket-categories";
import { validateTicketDepartmentForTicketCreation } from "@/lib/ticket-departments";
import type {
  Ticket,
  CreateTicketFormData,
  UpdateTicketFormData,
  ApiResponse,
} from "@/types";

/**
 * Generate a unique ticket number
 */
async function generateTicketNumber(): Promise<string> {
  const { getSystemSettings } = await import("@/lib/settings-utils");
  const settings = await getSystemSettings();
  const prefix =
    settings.tickets.ticketNumberPrefix ||
    process.env.TICKET_NUMBER_PREFIX ||
    "TICKET";

  const { generateTicketNumberAtomic } = await import("@/lib/request-utils");
  return generateTicketNumberAtomic(prefix);
}

/**
 * Create a new support ticket
 */
export async function createTicket(
  data: CreateTicketFormData
): Promise<ApiResponse<Ticket>> {
  try {
    // Validate authentication
    const session = await requireAuth();
    const userId = session.user.id;

    // Validate input
    const validatedData = createTicketSchema.parse(data);
    const categoryCheck = await validateTicketCategoryForTicketCreation(
      validatedData.category,
    );
    if (!categoryCheck.ok) {
      return { success: false, error: categoryCheck.error };
    }
    const departmentSlug = validatedData.departmentSlug || undefined;
    const departmentCheck = await validateTicketDepartmentForTicketCreation(
      departmentSlug
    );
    if (!departmentCheck.ok) {
      return { success: false, error: departmentCheck.error };
    }

    // Check if purchase code verification is required
    const purchaseCodeRequired = await isPurchaseCodeRequired();

    if (purchaseCodeRequired) {
      // Validate purchase code is provided
      if (!validatedData.purchaseCode) {
        return {
          success: false,
          error: "Purchase code is required to create a support ticket",
        };
      }

      // Verify purchase code with Envato API
      const verificationResult = await verifyPurchaseCode(
        validatedData.purchaseCode
      );

      if (!verificationResult.success) {
        return {
          success: false,
          error: verificationResult.error || "Invalid purchase code",
        };
      }

      // Purchase code verified - continue with ticket creation
      // The verification data will be stored with the ticket
    }

    // Generate ticket number
    const ticketNumber = await generateTicketNumber();

    // Verify purchase code if provided (even if not required)
    let purchaseVerification = undefined;
    if (validatedData.purchaseCode && !purchaseCodeRequired) {
      const verificationResult = await verifyPurchaseCode(
        validatedData.purchaseCode
      );
      if (verificationResult.success && verificationResult.data) {
        purchaseVerification = verificationResult.data;
      }
    } else if (validatedData.purchaseCode && purchaseCodeRequired) {
      // Already verified above, get the data again
      const verificationResult = await verifyPurchaseCode(
        validatedData.purchaseCode
      );
      if (verificationResult.success && verificationResult.data) {
        purchaseVerification = verificationResult.data;
      }
    }

    // Create ticket object
    const now = new Date();
    const { assignByDepartment } = await import("@/lib/ai/assign-by-department");
    const assignedToId = await assignByDepartment(departmentSlug);
    const ticket: Omit<Ticket, "_id"> = {
      ticketNumber,
      title: validatedData.title,
      description: validatedData.description,
      status: "open",
      priority: validatedData.priority,
      category: validatedData.category,
      departmentSlug,
      productSlug: validatedData.productSlug || undefined,
      customerId: userId,
      assignedToId: assignedToId || undefined,
      productName: validatedData.productName,
      productVersion: validatedData.productVersion,
      purchaseCode: validatedData.purchaseCode,
      purchaseVerification: purchaseVerification,
      tags: [],
      timezone: validatedData.timezone,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };

    // Decide which collection to use based on category
    const kind = getKindFromCategory(validatedData.category);
    const collectionName = getRequestCollectionName(kind);

    // Insert into appropriate collection
    const ticketsCollection = await getCollection<Ticket>(collectionName);
    const result = await ticketsCollection.insertOne(ticket as any);
    const insertedId = result.insertedId;

    // Create ticket history entries
    const historyCollection = await getCollection("ticket_history");
    const historyEntries: Record<string, unknown>[] = [
      {
        ticketId: insertedId,
        requestType: kind,
        userId,
        action: "created",
        createdAt: now,
      },
    ];
    if (assignedToId) {
      historyEntries.push({
        ticketId: insertedId,
        requestType: kind,
        userId: "ai-agent",
        action: "assigned",
        newValue: assignedToId,
        metadata: {
          assignedBy: "auto_department_routing",
          departmentSlug,
        },
        createdAt: now,
      });
    }
    await historyCollection.insertMany(historyEntries);

    // Revalidate paths for the appropriate section
    const idString = insertedId.toString();
    const paths = getRequestPaths(idString, kind);
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    revalidatePath(paths.dashboardList);
    revalidatePath(paths.dashboardDetail);
    revalidatePath(paths.adminList);
    revalidatePath(paths.adminDetail);

    try {
      if (assignedToId) {
        const titlePrefix =
          kind === "installation"
            ? "Installation Request"
            : kind === "customization"
              ? "Customization Request"
              : "Ticket";

        await createNotification({
          userId: assignedToId,
          type: "ticket_assignment",
          title: `${titlePrefix} Assigned to You`,
          body: `You have been assigned to ${titlePrefix.toLowerCase()} #${ticketNumber}: ${validatedData.title}`,
          data: {
            ticketId: idString,
            ticketNumber,
            url: paths.supportDetail,
            ...(kind === "installation" && { installationId: idString }),
            ...(kind === "customization" && { customizationId: idString }),
          },
        });

        const { sendTicketAssignmentEmail } = await import(
          "@/lib/ticket-email-notifications"
        );
        await sendTicketAssignmentEmail({
          assigneeId: assignedToId,
          ticket,
          ticketUrl: `${baseUrl}${paths.supportDetail}`,
        });
      }
    } catch (assignmentNotificationError) {
      console.error(
        "Failed to send auto-assignment notification:",
        assignmentNotificationError
      );
    }

    try {
      const usersCollection = await getCollection("user");
      const customer = await usersCollection.findOne({ id: userId });
      const { sendNewTicketIntegrationNotifications } = await import(
        "@/lib/ticket-integrations"
      );

      await sendNewTicketIntegrationNotifications({
        ticket: { ...ticket, _id: insertedId } as Ticket,
        kind,
        actorName: session.user.name || customer?.name || "Customer",
        actorRole: "customer",
        customerName: customer?.name || session.user.name || "Unknown",
        customerEmail: customer?.email || session.user.email || undefined,
        customerCountry: customer?.country,
        adminUrl: `${baseUrl}${paths.adminDetail}`,
        dashboardUrl: `${baseUrl}${paths.dashboardDetail}`,
      });
    } catch (integrationError) {
      console.error(
        "Failed to send Slack/Discord ticket notifications:",
        integrationError
      );
    }

    // Send email notifications (customer + admin) if enabled
    try {
      const { sendEmail, emailTemplates, shouldSendEmailNotification } =
        await import("@/lib/email");
      const { enabled: sendNewTicketEmail } =
        await shouldSendEmailNotification("newTicket");

      if (sendNewTicketEmail) {
        const user = session.user;
        const usersCollection = await getCollection("user");
        const customer = await usersCollection.findOne({ id: userId });

        // Customer email
        if (user.email) {
          const emailResult = await sendEmail({
            to: user.email,
            ...emailTemplates.ticketCreated(ticketNumber, validatedData.title),
          });

          if (!emailResult.success) {
            console.error(
              `Failed to send ticket creation email to ${user.email}:`,
              emailResult.error
            );
          }
        }

        const { sendAdminNewTicketEmails } = await import(
          "@/lib/ticket-email-notifications"
        );
        await sendAdminNewTicketEmails({
          ticket: { ...ticket, _id: insertedId } as Ticket,
          customerName: customer?.name || user.name || "Unknown",
          customerEmail: customer?.email || user.email || "Unknown",
          customerCountry: customer?.country,
          ticketUrl: `${baseUrl}${paths.adminDetail}`,
        });
      }
    } catch (emailError) {
      console.error("Failed to send ticket creation emails:", emailError);
    }

    // Send real-time notifications to admin users
    try {
      // Exclude the actor: a user with the admin role who files a ticket from
      // the customer dashboard should not be notified about their own ticket.
      const adminIds = (await getUserIdsByRole(["admin"])).filter(
        (id) => id !== session.user.id
      );
      console.log(
        "[Notifications] Found admin users:",
        adminIds
      );

      if (adminIds.length > 0) {
        let notificationTitle = "New Support Ticket";
        let notificationBody = `${session.user.name} created ticket #${ticketNumber}: ${validatedData.title}`;
        let url = `/admin/tickets/${idString}`;
        const data: any = {
          ticketId: idString,
          ticketNumber,
          url,
        };

        if (kind === "installation") {
          notificationTitle = "New Installation Request";
          notificationBody = `${session.user.name} created installation request #${ticketNumber}: ${validatedData.title}`;
          url = `/admin/installation/${idString}`;
          data.installationId = idString;
          data.url = url;
        } else if (kind === "customization") {
          notificationTitle = "New Customization Request";
          notificationBody = `${session.user.name} created customization request #${ticketNumber}: ${validatedData.title}`;
          url = `/admin/customization/${idString}`;
          data.customizationId = idString;
          data.url = url;
        }

        console.log("[Notifications] Creating bulk notifications with:", {
          userIds: adminIds,
          title: notificationTitle,
          body: notificationBody,
          data,
        });

        const notificationResult = await createBulkNotifications(
          adminIds,
          {
            type: "new_ticket",
            title: notificationTitle,
            body: notificationBody,
            data,
          }
        );

        console.log(
          "[Notifications] Bulk notification result:",
          notificationResult
        );

        // Mirror the alert to the shared admin Telegram group (send-only),
        // including the ticket description so admins see the full request.
        const descriptionPreview = toPlainPreview(validatedData.description);
        void notifyAdminsTelegram({
          title: notificationTitle,
          body:
            notificationBody +
            (descriptionPreview ? `\n\n${descriptionPreview}` : ""),
          url,
        });
      } else {
        console.log("[Notifications] No admin/support users found to notify");
      }
    } catch (notificationError) {
      console.error(
        "Failed to send new ticket notifications:",
        notificationError
      );
      // Don't fail the entire operation if notifications fail
    }

    // Serialize the ticket data to avoid ObjectId serialization issues
    const serializedTicket = {
      ...ticket,
      _id: idString,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      lastActivityAt: ticket.lastActivityAt.toISOString(),
    };

    return {
      success: true,
      data: serializedTicket as any,
      message: "Ticket created successfully",
    };
  } catch (error: any) {
    console.error("Error creating ticket:", error);
    return {
      success: false,
      error: error.message || "Failed to create ticket",
    };
  }
}

/**
 * Get all tickets for the current user
 */
export async function getMyTickets(filters?: {
  status?: string;
  priority?: string;
  search?: string;
}): Promise<ApiResponse<Ticket[]>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const ticketsCollection = await getCollection<Ticket>("tickets");
    const query: any = {
      customerId: userId,
      // Exclude installation & customization requests, which have their own sections
      category: { $nin: ["feature_request", "technical_support", "service"] },
    };

    // Apply filters
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.priority) {
      query.priority = filters.priority;
    }
    if (filters?.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
        { ticketNumber: { $regex: filters.search, $options: "i" } },
      ];
    }

    const tickets = await ticketsCollection
      .find(query)
      .sort({ lastActivityAt: -1 })
      .toArray();

    return {
      success: true,
      data: toPlainObject(tickets as Ticket[]),
    };
  } catch (error: any) {
    console.error("Error fetching tickets:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch tickets",
    };
  }
}

/**
 * Get customization requests for the current user (feature_request category)
 */
export async function getMyCustomizationRequests(filters?: {
  status?: string;
  priority?: string;
  search?: string;
}): Promise<ApiResponse<Ticket[]>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // New collection dedicated to customization requests
    const customizationCollection = await getCollection<Ticket>(
      getRequestCollectionName("customization")
    );
    const legacyTicketsCollection = await getCollection<Ticket>("tickets");

    const baseQuery: any = {
      customerId: userId,
    };
    const legacyQuery: any = {
      customerId: userId,
      category: "feature_request",
    };

    // Apply filters
    if (filters?.status) {
      baseQuery.status = filters.status;
      legacyQuery.status = filters.status;
    }
    if (filters?.priority) {
      baseQuery.priority = filters.priority;
      legacyQuery.priority = filters.priority;
    }
    if (filters?.search) {
      const searchFilter = [
        { title: { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
        { ticketNumber: { $regex: filters.search, $options: "i" } },
      ];
      baseQuery.$or = searchFilter;
      legacyQuery.$or = searchFilter;
    }

    const [newRequests, legacyRequests] = await Promise.all([
      customizationCollection
        .find(baseQuery)
        .sort({ lastActivityAt: -1 })
        .toArray(),
      legacyTicketsCollection
        .find(legacyQuery)
        .sort({ lastActivityAt: -1 })
        .toArray(),
    ]);

    const allRequests = [...newRequests, ...legacyRequests];
    const getTime = (t: Ticket) =>
      t.lastActivityAt instanceof Date ? t.lastActivityAt.getTime() : 0;
    allRequests.sort((a, b) => getTime(b) - getTime(a));

    return {
      success: true,
      data: toPlainObject(allRequests as Ticket[]),
    };
  } catch (error: any) {
    console.error("Error fetching customization requests:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch customization requests",
    };
  }
}

/**
 * Get installation requests for the current user (technical_support category)
 */
export async function getMyInstallationRequests(filters?: {
  status?: string;
  priority?: string;
  search?: string;
}): Promise<ApiResponse<Ticket[]>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // New collection dedicated to installation requests
    const installationCollection = await getCollection<Ticket>(
      getRequestCollectionName("installation")
    );
    const legacyTicketsCollection = await getCollection<Ticket>("tickets");

    const baseQuery: any = {
      customerId: userId,
    };
    const legacyQuery: any = {
      customerId: userId,
      category: "technical_support",
    };

    // Apply filters
    if (filters?.status) {
      baseQuery.status = filters.status;
      legacyQuery.status = filters.status;
    }
    if (filters?.priority) {
      baseQuery.priority = filters.priority;
      legacyQuery.priority = filters.priority;
    }
    if (filters?.search) {
      const searchFilter = [
        { title: { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
        { ticketNumber: { $regex: filters.search, $options: "i" } },
      ];
      baseQuery.$or = searchFilter;
      legacyQuery.$or = searchFilter;
    }

    const [newRequests, legacyRequests] = await Promise.all([
      installationCollection
        .find(baseQuery)
        .sort({ lastActivityAt: -1 })
        .toArray(),
      legacyTicketsCollection
        .find(legacyQuery)
        .sort({ lastActivityAt: -1 })
        .toArray(),
    ]);

    const allRequests = [...newRequests, ...legacyRequests];
    const getTime = (t: Ticket) =>
      t.lastActivityAt instanceof Date ? t.lastActivityAt.getTime() : 0;
    allRequests.sort((a, b) => getTime(b) - getTime(a));

    return {
      success: true,
      data: toPlainObject(allRequests as Ticket[]),
    };
  } catch (error: any) {
    console.error("Error fetching installation requests:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch installation requests",
    };
  }
}

/**
 * Get a single ticket/request by ID.
 *
 * This is now aware of all request collections (tickets, installation_requests,
 * customization_requests) via findRequestById.
 */
export async function getTicketById(
  ticketId: string
): Promise<ApiResponse<Ticket>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const userRole = (session.user as any).role;

    const { request } = await findRequestById(ticketId);

    if (!request) {
      return {
        success: false,
        error: "Ticket not found",
      };
    }

    // Check permissions: customer can only view their own tickets/requests
    if (userRole === "customer" && request.customerId !== userId) {
      return {
        success: false,
        error: "You don't have permission to view this ticket",
      };
    }

    return {
      success: true,
      data: request as Ticket,
    };
  } catch (error: any) {
    console.error("Error fetching ticket:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch ticket",
    };
  }
}

/**
 * Update a ticket (status, priority, assignment, etc.)
 */
export async function updateTicket(
  ticketId: string,
  data: UpdateTicketFormData
): Promise<ApiResponse<Ticket>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const userRole = (session.user as any).role;

    // Validate input
    const validatedData = updateTicketSchema.parse(data);

    const ticketsCollection = await getCollection<Ticket>("tickets");
    const ticket = await ticketsCollection.findOne({
      _id: new ObjectId(ticketId),
    });

    if (!ticket) {
      return {
        success: false,
        error: "Ticket not found",
      };
    }

    // Check permissions
    if (userRole === "customer" && ticket.customerId !== userId) {
      return {
        success: false,
        error: "You don't have permission to update this ticket",
      };
    }

    // Prepare update data
    const updateData: any = {
      ...validatedData,
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    };

    // Add resolved/closed timestamps
    if (validatedData.status === "resolved" && !ticket.resolvedAt) {
      updateData.resolvedAt = new Date();
    }
    if (validatedData.status === "closed" && !ticket.closedAt) {
      updateData.closedAt = new Date();
    }

    // Update ticket
    const result = await ticketsCollection.findOneAndUpdate(
      { _id: new ObjectId(ticketId) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    // Create history entries for changes
    const historyCollection = await getCollection("ticket_history");
    const now = new Date();

    if (validatedData.status && validatedData.status !== ticket.status) {
      await historyCollection.insertOne({
        ticketId,
        userId,
        action: "status_changed",
        oldValue: ticket.status,
        newValue: validatedData.status,
        createdAt: now,
      });

      // Keep the AI knowledge index in sync with resolved tickets.
      void (async () => {
        try {
          const idx = await import("@/lib/ai/knowledge-index");
          if (validatedData.status === "resolved") {
            await idx.upsertResolvedTicketEmbedding(ticketId);
          } else if (ticket.status === "resolved") {
            await idx.removeResolvedTicketEmbedding(ticketId);
          }
        } catch (e) {
          console.error("[ai-index] resolved-ticket sync failed", e);
        }
      })();

      // Send email notification (if enabled)
      try {
        const { getSystemSettings } = await import("@/lib/settings-utils");
        const settings = await getSystemSettings();
        const envFlag = process.env.EMAIL_NOTIFICATIONS_ENABLED;
        const emailEnabled =
          envFlag === "true"
            ? true
            : envFlag === "false"
              ? false
              : settings.email.enabled;

        const isResolution =
          validatedData.status === "resolved" || validatedData.status === "closed";
        const shouldSend =
          emailEnabled &&
          (isResolution
            ? settings.email.notifyOnTicketResolution
            : settings.email.notifyOnTicketUpdate);

        if (shouldSend) {
          const { sendEmail, emailTemplates } = await import("@/lib/email");
          // Guests have no account — resolve the recipient (and a portal link)
          // from the guest fields instead of the user collection.
          let recipientEmail: string | undefined;
          let viewUrl: string | undefined;
          if (ticket.isGuest) {
            recipientEmail = ticket.guestEmail;
            if (ticket.guestAccessToken) {
              const portalBase =
                process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
              viewUrl = `${portalBase}/support/ticket/${ticket.guestAccessToken}`;
            }
          } else {
            const usersCollection = await getCollection("user");
            const customer = await usersCollection.findOne({
              id: ticket.customerId,
            });
            recipientEmail = customer?.email as string | undefined;
          }
          if (recipientEmail) {
            await sendEmail({
              to: recipientEmail,
              ...emailTemplates.ticketStatusChanged(
                ticket.ticketNumber,
                ticket.title,
                ticket.status,
                validatedData.status,
                undefined,
                viewUrl
              ),
            });
          }
        }
      } catch (emailError) {
        console.error("Failed to send status update email:", emailError);
      }
    }

    if (validatedData.priority && validatedData.priority !== ticket.priority) {
      await historyCollection.insertOne({
        ticketId,
        userId,
        action: "priority_changed",
        oldValue: ticket.priority,
        newValue: validatedData.priority,
        createdAt: now,
      });
    }

    if (
      validatedData.assignedToId &&
      validatedData.assignedToId !== ticket.assignedToId
    ) {
      await historyCollection.insertOne({
        ticketId,
        userId,
        action: "assigned",
        newValue: validatedData.assignedToId,
        createdAt: now,
      });
    }

    // Revalidate paths
    revalidatePath("/dashboard/tickets");
    revalidatePath(`/dashboard/tickets/${ticketId}`);

    return {
      success: true,
      data: result as Ticket,
      message: "Ticket updated successfully",
    };
  } catch (error: any) {
    console.error("Error updating ticket:", error);
    return {
      success: false,
      error: error.message || "Failed to update ticket",
    };
  }
}

/**
 * Update customization request content (title, description, priority, product info)
 */
export async function updateCustomizationContent(
  ticketId: string,
  data: {
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
    productName?: string;
    productVersion?: string;
  }
): Promise<ApiResponse<Ticket>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Validate input
    const validatedData = updateCustomizationSchema.parse(data);

    const lookup = await findRequestById(ticketId);
    const ticket = lookup.request;

    if (!ticket || lookup.kind !== "customization" || !lookup.collectionName) {
      return {
        success: false,
        error: "Customization request not found",
      };
    }

    // Check permissions: customer can only update their own requests
    if (ticket.customerId !== userId) {
      return {
        success: false,
        error: "You don't have permission to update this customization request",
      };
    }

    // Prepare update data
    const now = new Date();
    const updateData: any = {
      title: validatedData.title,
      description: validatedData.description,
      priority: validatedData.priority,
      productName: validatedData.productName,
      productVersion: validatedData.productVersion,
      updatedAt: now,
      lastActivityAt: now,
    };

    const requestsCollection = await getCollection<Ticket>(
      lookup.collectionName
    );

    const result = await requestsCollection.findOneAndUpdate(
      { _id: new ObjectId(ticketId) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    const updated = (result as any)?.value || ticket;

    // Create history entry
    const historyCollection = await getCollection("ticket_history");
    await historyCollection.insertOne({
      ticketId: new ObjectId(ticketId),
      requestType: lookup.kind,
      userId,
      action: "updated",
      createdAt: now,
    });

    // Revalidate paths for this customization request
    const idString = ticketId.toString();
    const paths = getRequestPaths(idString, lookup.kind);
    revalidatePath(paths.dashboardList);
    revalidatePath(paths.dashboardDetail);
    revalidatePath(`${paths.dashboardDetail}/edit`);
    revalidatePath(paths.adminList);
    revalidatePath(paths.adminDetail);

    return {
      success: true,
      data: updated as Ticket,
      message: "Customization request updated successfully",
    };
  } catch (error: any) {
    console.error("Error updating customization request:", error);
    return {
      success: false,
      error: error.message || "Failed to update customization request",
    };
  }
}

/**
 * Update installation request content (title, description, priority, product info)
 */
export async function updateInstallationContent(
  ticketId: string,
  data: {
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
    productName?: string;
    productVersion?: string;
  }
): Promise<ApiResponse<Ticket>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Validate input
    const validatedData = updateInstallationSchema.parse(data);

    const lookup = await findRequestById(ticketId);
    const ticket = lookup.request;

    if (!ticket || lookup.kind !== "installation" || !lookup.collectionName) {
      return {
        success: false,
        error: "Installation request not found",
      };
    }

    // Check permissions: customer can only update their own requests
    if (ticket.customerId !== userId) {
      return {
        success: false,
        error: "You don't have permission to update this installation request",
      };
    }

    // Prepare update data
    const now = new Date();
    const updateData: any = {
      title: validatedData.title,
      description: validatedData.description,
      priority: validatedData.priority,
      productName: validatedData.productName,
      productVersion: validatedData.productVersion,
      updatedAt: now,
      lastActivityAt: now,
    };

    const requestsCollection = await getCollection<Ticket>(
      lookup.collectionName
    );

    const result = await requestsCollection.findOneAndUpdate(
      { _id: new ObjectId(ticketId) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    const updated = (result as any)?.value || ticket;

    // Create history entry
    const historyCollection = await getCollection("ticket_history");
    await historyCollection.insertOne({
      ticketId: new ObjectId(ticketId),
      requestType: lookup.kind,
      userId,
      action: "updated",
      createdAt: now,
    });

    // Revalidate paths for this installation request
    const idString = ticketId.toString();
    const paths = getRequestPaths(idString, lookup.kind);
    revalidatePath(paths.dashboardList);
    revalidatePath(paths.dashboardDetail);
    revalidatePath(`${paths.dashboardDetail}/edit`);
    revalidatePath(paths.adminList);
    revalidatePath(paths.adminDetail);

    return {
      success: true,
      data: updated as Ticket,
      message: "Installation request updated successfully",
    };
  } catch (error: any) {
    console.error("Error updating installation request:", error);
    return {
      success: false,
      error: error.message || "Failed to update installation request",
    };
  }
}
