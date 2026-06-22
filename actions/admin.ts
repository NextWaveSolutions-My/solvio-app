"use server";

import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-utils";
import { requirePermissionOrThrow } from "@/lib/auth-utils";
import {
  createUserSchema,
  updateUserSchema,
  adminCreateTicketSchema,
} from "@/lib/validations";
import {
  createNotification,
  createBulkNotifications,
} from "@/lib/notifications";
import type {
  ApiResponse,
  Ticket,
  User,
  AccountStatus,
  CreateUserFormData,
  UpdateUserFormData,
  AdminCreateTicketFormData,
} from "@/types";
import { getUserIdsByRole } from "@/lib/user-utils";
import { deleteTicketAttachments } from "@/actions/attachments";
import {
  findRequestById,
  getKindFromCategory,
  getRequestCollectionName,
  getRequestPaths,
} from "@/lib/request-utils";
import { toPlainObject } from "@/lib/serialization";
import type { RequestKind } from "@/lib/request-utils";
import { validateTicketCategoryForTicketCreation } from "@/lib/ticket-categories";
import { validateTicketDepartmentForTicketCreation } from "@/lib/ticket-departments";
import { hashPassword as betterAuthHashPassword } from "better-auth/crypto";

// Check if user is admin or support
async function requireAdminOrSupport() {
  const session = await requirePermissionOrThrow(
    ["panel.admin.access", "panel.support.access"],
    { any: true, message: "Forbidden: Staff access required" },
  );
  const user = session.user as User;
  const role = user.role || "customer";
  return { user, role };
}

// Get all tickets (admin/support only)
export async function getAllTickets(filters?: {
  status?: string;
  priority?: string;
  assignedToId?: string;
  search?: string;
  category?: string;
}): Promise<ApiResponse<Ticket[]>> {
  try {
    await requirePermissionOrThrow("tickets.view_all", {
      message: "Forbidden: Tickets view access required",
    });
    await requireAdminOrSupport();

    const ticketsCollection = await getCollection("tickets");
    const query: Record<string, unknown> = {};

    // Apply filters
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.priority) {
      query.priority = filters.priority;
    }
    if (filters?.assignedToId) {
      query.assignedToId = filters.assignedToId;
    }
    if (filters?.category) {
      // Explicit category filter (e.g. installation/customization pages)
      query.category = filters.category;
    } else {
      // Default "Tickets" views should exclude installation & customization
      // which are handled in their own dedicated sections
      query.category = {
        $nin: ["feature_request", "technical_support", "service"],
      };
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
      .sort({ createdAt: -1 })
      .toArray();

    return {
      success: true,
      data: toPlainObject(tickets as Ticket[]),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch tickets";
    console.error("Get all tickets error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Get customization requests (admin/support view)
// Reads from the dedicated customization_requests collection plus
// legacy tickets with category "feature_request".
export async function getCustomizationRequests(filters?: {
  status?: string;
  priority?: string;
  search?: string;
}): Promise<ApiResponse<Ticket[]>> {
  try {
    await requirePermissionOrThrow("tickets.view_all", {
      message: "Forbidden: Tickets view access required",
    });
    await requireAdminOrSupport();

    const customizationCollection = await getCollection<Ticket>(
      getRequestCollectionName("customization"),
    );
    const legacyTicketsCollection = await getCollection<Ticket>("tickets");

    const baseQuery: Record<string, unknown> = {};
    const legacyQuery: Record<string, unknown> = {
      category: "feature_request",
    };

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
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch customization requests";
    console.error("Get customization requests error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Get installation requests (admin/support view)
// Reads from the dedicated installation_requests collection plus
// legacy tickets with category "technical_support".
export async function getInstallationRequests(filters?: {
  status?: string;
  priority?: string;
  search?: string;
}): Promise<ApiResponse<Ticket[]>> {
  try {
    await requirePermissionOrThrow("tickets.view_all", {
      message: "Forbidden: Tickets view access required",
    });
    await requireAdminOrSupport();

    const installationCollection = await getCollection<Ticket>(
      getRequestCollectionName("installation"),
    );
    const legacyTicketsCollection = await getCollection<Ticket>("tickets");

    const baseQuery: Record<string, unknown> = {};
    const legacyQuery: Record<string, unknown> = {
      category: "technical_support",
    };

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
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch installation requests";
    console.error("Get installation requests error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Get all users (admin only)
export async function getAllUsers(filters?: {
  role?: string;
  search?: string;
}): Promise<ApiResponse<User[]>> {
  try {
    await requirePermissionOrThrow("users.view", {
      message: "Forbidden: Users access required",
    });

    const usersCollection = await getCollection<User>("user");
    const query: Record<string, unknown> = {};

    // Apply filters
    if (filters?.role) {
      query.role = filters.role;
    }
    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { email: { $regex: filters.search, $options: "i" } },
      ];
    }

    const users = await usersCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Ensure all users have an id field (fallback to _id.toString() if missing or "undefined")
    const usersWithId = users.map((user) => ({
      ...user,
      id: user.id && user.id !== "undefined" ? user.id : user._id?.toString(),
    }));

    return {
      success: true,
      data: usersWithId as User[],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch users";
    console.error("Get all users error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Get client users with ticket counts (admin/support only)
export async function getClientUsers(filters?: { search?: string }): Promise<
  ApiResponse<
    (User & {
      ticketCount: number;
      openTickets: number;
      resolvedTickets: number;
      lastTicketDate?: Date;
    })[]
  >
> {
  try {
    await requireAdminOrSupport();

    const usersCollection = await getCollection("user");
    const ticketsCollection = await getCollection("tickets");

    // Build query for customer role only
    const query: Record<string, unknown> = { role: "customer" };

    // Apply search filter
    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { email: { $regex: filters.search, $options: "i" } },
        { envatoUsername: { $regex: filters.search, $options: "i" } },
      ];
    }

    // Get all client users
    const users = await usersCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Ensure all users have an id field (fallback to _id.toString() if missing or "undefined")
    const usersWithId = users.map((user) => ({
      ...user,
      id: user.id && user.id !== "undefined" ? user.id : user._id?.toString(),
    }));

    // Get ticket statistics for each user
    const userIds = usersWithId.map((u) => u.id);

    // Aggregate ticket counts per user
    const ticketStats = await ticketsCollection
      .aggregate([
        {
          $match: {
            customerId: { $in: userIds },
          },
        },
        {
          $group: {
            _id: "$customerId",
            ticketCount: { $sum: 1 },
            openTickets: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$status",
                      ["open", "in_progress", "waiting_on_customer"],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            resolvedTickets: {
              $sum: {
                $cond: [{ $in: ["$status", ["resolved", "closed"]] }, 1, 0],
              },
            },
            lastTicketDate: { $max: "$createdAt" },
          },
        },
      ])
      .toArray();

    // Create a map of ticket stats by user ID
    const statsMap = new Map(
      ticketStats.map((stat) => [
        stat._id,
        {
          ticketCount: stat.ticketCount,
          openTickets: stat.openTickets,
          resolvedTickets: stat.resolvedTickets,
          lastTicketDate: stat.lastTicketDate,
        },
      ]),
    );

    // Combine user data with ticket stats
    const clientsWithStats = usersWithId.map((user) => ({
      ...user,
      ticketCount: statsMap.get(user.id)?.ticketCount || 0,
      openTickets: statsMap.get(user.id)?.openTickets || 0,
      resolvedTickets: statsMap.get(user.id)?.resolvedTickets || 0,
      lastTicketDate: statsMap.get(user.id)?.lastTicketDate,
    }));

    // Serialize to plain objects to avoid ObjectId serialization issues
    const serializedClients = JSON.parse(JSON.stringify(clientsWithStats));

    return {
      success: true,
      data: serializedClients as (User & {
        ticketCount: number;
        openTickets: number;
        resolvedTickets: number;
        lastTicketDate?: Date;
      })[],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch client users";
    console.error("Get client users error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Generate a unique ticket number
 *
 * Uses count across all request-like collections so numbers remain
 * unique after splitting installation/customization into their own
 * collections.
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
 * Create a ticket on behalf of a customer (admin/support only)
 */
export async function adminCreateTicket(
  data: AdminCreateTicketFormData,
): Promise<ApiResponse<Ticket>> {
  try {
    // Validate authentication and authorization
    const { user: adminUser } = await requireAdminOrSupport();

    // Validate input
    const validatedData = adminCreateTicketSchema.parse(data);
    const categoryCheck = await validateTicketCategoryForTicketCreation(
      validatedData.category,
    );
    if (!categoryCheck.ok) {
      return { success: false, error: categoryCheck.error };
    }
    const departmentSlug = validatedData.departmentSlug || undefined;
    const departmentCheck =
      await validateTicketDepartmentForTicketCreation(departmentSlug);
    if (!departmentCheck.ok) {
      return { success: false, error: departmentCheck.error };
    }

    // Verify the customer exists
    const usersCollection = await getCollection("user");
    console.log(
      "[AdminCreateTicket] Looking up customer with id:",
      validatedData.customerId,
    );
    let customer = await usersCollection.findOne({
      id: validatedData.customerId,
    });

    // Fallback: Try looking up by _id if not found by id
    if (!customer) {
      console.log(
        "[AdminCreateTicket] Customer not found by id, trying _id lookup",
      );
      try {
        if (ObjectId.isValid(validatedData.customerId)) {
          customer = await usersCollection.findOne({
            _id: new ObjectId(validatedData.customerId),
          });
          if (customer) {
            console.log(
              "[AdminCreateTicket] Customer found by _id:",
              customer.email,
            );
          }
        }
      } catch (e) {
        console.error("[AdminCreateTicket] Fallback lookup failed:", e);
      }
    } else {
      console.log("[AdminCreateTicket] Customer found by id:", customer.email);
    }

    if (!customer) {
      console.error(
        "[AdminCreateTicket] Customer not found for ID:",
        validatedData.customerId,
      );
      return {
        success: false,
        error: "Customer not found",
      };
    }

    // Generate ticket number
    const ticketNumber = await generateTicketNumber();

    // Create ticket/request object
    const now = new Date();
    const { assignByDepartment } = await import(
      "@/lib/ai/assign-by-department"
    );
    const assignedToId = await assignByDepartment(departmentSlug);
    const ticket: Omit<Ticket, "_id"> = {
      ticketNumber,
      title: validatedData.title,
      description: validatedData.description,
      status: "open",
      priority: validatedData.priority,
      category: validatedData.category,
      departmentSlug,
      customerId: validatedData.customerId,
      assignedToId: assignedToId || undefined,
      productSlug: validatedData.productSlug || undefined,
      productName: validatedData.productName,
      productVersion: validatedData.productVersion,
      purchaseCode: validatedData.purchaseCode,
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
    const result = await ticketsCollection.insertOne(ticket as Ticket);
    const insertedId = result.insertedId;

    // Create ticket/request history entry
    const historyCollection = await getCollection("ticket_history");
    await historyCollection.insertOne({
      ticketId: insertedId,
      requestType: kind,
      userId: adminUser.id,
      action: "created",
      metadata: {
        createdBy: "admin",
        adminId: adminUser.id,
        adminName: adminUser.name,
        customerId: validatedData.customerId,
        customerName: customer.name,
      },
      createdAt: now,
    });

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
      const { sendNewTicketIntegrationNotifications } = await import(
        "@/lib/ticket-integrations"
      );

      await sendNewTicketIntegrationNotifications({
        ticket: { ...ticket, _id: insertedId } as Ticket,
        kind,
        actorName: adminUser.name || "Admin",
        actorRole: adminUser.role || "admin",
        customerName: customer.name || "Unknown",
        customerEmail: customer.email || undefined,
        customerCountry: customer.country,
        adminUrl: `${baseUrl}${paths.adminDetail}`,
        dashboardUrl: `${baseUrl}${paths.dashboardDetail}`,
      });
    } catch (integrationError) {
      console.error(
        "Failed to send Slack/Discord ticket notifications:",
        integrationError,
      );
    }

    // Send email notifications (customer + admin) if enabled
    try {
      const { sendEmail, emailTemplates, shouldSendEmailNotification } =
        await import("@/lib/email");
      const { enabled: sendNewTicketEmail } =
        await shouldSendEmailNotification("newTicket");

      if (sendNewTicketEmail) {
        if (customer.email) {
          await sendEmail({
            to: customer.email,
            ...emailTemplates.ticketCreated(ticketNumber, validatedData.title),
          });
        }

        const { sendAdminNewTicketEmails } = await import(
          "@/lib/ticket-email-notifications"
        );
        await sendAdminNewTicketEmails({
          ticket: { ...ticket, _id: insertedId } as Ticket,
          customerName: customer.name || "Unknown",
          customerEmail: customer.email || "Unknown",
          customerCountry: customer.country,
          ticketUrl: `${baseUrl}${paths.adminDetail}`,
        });
      }
    } catch (emailError) {
      console.error("Failed to send ticket creation emails:", emailError);
    }

    // Send real-time notification to customer
    try {
      let notificationTitle = "New Support Ticket Created";
      let notificationBody = `A support ticket has been created for you: ${validatedData.title}`;
      let url = `/dashboard/tickets/${idString}`;
      const data: Record<string, string> = {
        ticketId: idString,
        ticketNumber,
        url,
      };

      if (kind === "installation") {
        notificationTitle = "New Installation Request Created";
        notificationBody = `An installation request has been created for you: ${validatedData.title}`;
        url = `/dashboard/installation/${idString}`;
        data.installationId = idString;
        data.url = url;
      } else if (kind === "customization") {
        notificationTitle = "New Customization Request Created";
        notificationBody = `A customization request has been created for you: ${validatedData.title}`;
        url = `/dashboard/customization/${idString}`;
        data.customizationId = idString;
        data.url = url;
      }

      await createNotification({
        userId: validatedData.customerId,
        type: "new_ticket",
        title: notificationTitle,
        body: notificationBody,
        data: { ...data, url: data.url || "" },
      });
    } catch (notificationError) {
      console.error("Failed to send customer notification:", notificationError);
    }

    // Send real-time notifications to other admin users
    try {
      const adminIds = await getUserIdsByRole(["admin"]);
      const otherAdminIds = adminIds.filter((id) => id !== adminUser.id);

      if (otherAdminIds.length > 0) {
        let notificationTitle = "New Support Ticket";
        let notificationBody = `${adminUser.name} created ticket #${ticketNumber} for ${customer.name}: ${validatedData.title}`;
        let url = `/admin/tickets/${idString}`;
        const data: Record<string, string> = {
          ticketId: idString,
          ticketNumber,
          url,
        };

        if (kind === "installation") {
          notificationTitle = "New Installation Request";
          notificationBody = `${adminUser.name} created installation request #${ticketNumber} for ${customer.name}: ${validatedData.title}`;
          url = `/admin/installation/${idString}`;
          data.installationId = idString;
          data.url = url;
        } else if (kind === "customization") {
          notificationTitle = "New Customization Request";
          notificationBody = `${adminUser.name} created customization request #${ticketNumber} for ${customer.name}: ${validatedData.title}`;
          url = `/admin/customization/${idString}`;
          data.customizationId = idString;
          data.url = url;
        }

        await createBulkNotifications(otherAdminIds, {
          type: "new_ticket",
          title: notificationTitle,
          body: notificationBody,
          data: { ...data, url: data.url || "" },
        });
      }
    } catch (notificationError) {
      console.error("Failed to send admin notifications:", notificationError);
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
      data: serializedTicket as unknown as Ticket,
      message: "Ticket created successfully",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create ticket";
    console.error("Error creating ticket:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Assign ticket to support/admin
export async function assignTicket(
  ticketId: string,
  assignedToId: string | null,
): Promise<ApiResponse<Ticket>> {
  try {
    await requirePermissionOrThrow(["tickets.assign", "tickets.manage"], {
      any: true,
      message: "Forbidden: Ticket assignment access required",
    });
    const { user } = await requireAdminOrSupport();

    const { request, kind, collectionName } = await findRequestById(ticketId);
    if (!request || !collectionName || !kind) {
      throw new Error("Ticket not found");
    }

    const ticketsCollection = await getCollection<Ticket>(collectionName);
    const historyCollection = await getCollection("ticket_history");

    const previousAssignedToId = (request as Ticket).assignedToId || null;

    let normalizedAssignedToId = assignedToId;
    if (assignedToId) {
      const usersCollection = await getCollection<User>("user");
      const assignedUser = await usersCollection.findOne({
        $or: [
          { id: assignedToId },
          ObjectId.isValid(assignedToId)
            ? { _id: new ObjectId(assignedToId) }
            : {},
        ].filter((q) => Object.keys(q).length > 0),
      });

      if (!assignedUser) {
        return { success: false, error: "Assignee not found" };
      }

      normalizedAssignedToId = assignedUser.id || assignedUser._id.toString();
    }

    if (previousAssignedToId === normalizedAssignedToId) {
      return {
        success: true,
        data: JSON.parse(JSON.stringify(request)) as Ticket,
      };
    }

    const updateData: Record<string, unknown> = {
      assignedToId: normalizedAssignedToId,
      lastActivityAt: new Date(),
    };

    const updatedTicket = await ticketsCollection.findOneAndUpdate(
      { _id: new ObjectId(ticketId) },
      { $set: updateData },
      { returnDocument: "after" },
    );

    if (!updatedTicket) {
      throw new Error("Failed to update ticket");
    }

    await historyCollection.insertOne({
      ticketId: new ObjectId(ticketId),
      requestType: kind,
      userId: user.id,
      action: normalizedAssignedToId ? "assigned" : "unassigned",
      changes: {
        assignedToId: {
          from: previousAssignedToId,
          to: normalizedAssignedToId,
        },
      },
      createdAt: new Date(),
    });

    const baseTicket = (updatedTicket || request) as Ticket;

    // Send real-time notification to assigned user
    try {
      if (normalizedAssignedToId) {
        const base = baseTicket;
        const paths = getRequestPaths(
          ticketId,
          kind,
          kind === "service" ? base.serviceSlug : undefined,
        );
        const isTicket = kind === "ticket";
        const isInstallation = kind === "installation";
        const titlePrefix = isTicket
          ? "Ticket"
          : isInstallation
            ? "Installation Request"
            : "Customization Request";

        await createNotification({
          userId: normalizedAssignedToId,
          type: "ticket_assignment",
          title: `${titlePrefix} Assigned to You`,
          body: `You have been assigned to ${titlePrefix.toLowerCase()} #${
            base.ticketNumber
          }: ${base.title}`,
          data: {
            ticketId: ticketId,
            ticketNumber: base.ticketNumber,
            url: paths.supportDetail,
          },
        });

        const { sendTicketAssignmentEmail } = await import(
          "@/lib/ticket-email-notifications"
        );
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        await sendTicketAssignmentEmail({
          assigneeId: normalizedAssignedToId,
          ticket: base,
          ticketUrl: `${baseUrl}${paths.supportDetail}`,
        });
      }
    } catch (notificationError) {
      console.error(
        "Failed to send assignment notification:",
        notificationError,
      );
      // Don't fail the entire operation if notification fails
    }

    const kindsToRevalidate: RequestKind[] = ["ticket", kind];
    for (const k of kindsToRevalidate) {
      const paths = getRequestPaths(
        ticketId,
        k,
        k === "service" ? baseTicket.serviceSlug : undefined,
      );
      revalidatePath(paths.adminList);
      revalidatePath(paths.adminDetail);
      revalidatePath(paths.dashboardList);
      revalidatePath(paths.dashboardDetail);
      revalidatePath(paths.supportList);
      revalidatePath(paths.supportDetail);
    }

    const serializedTicket = JSON.parse(JSON.stringify(updatedTicket));

    return {
      success: true,
      data: serializedTicket as Ticket,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to assign ticket";
    console.error("Assign ticket error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Update ticket status (admin/support only)
export async function updateTicketStatus(
  ticketId: string,
  status:
    | "open"
    | "scheduled_meeting"
    | "in_progress"
    | "waiting_on_customer"
    | "resolved"
    | "closed",
  message?: string,
): Promise<ApiResponse<Ticket>> {
  try {
    await requirePermissionOrThrow(
      ["tickets.change_status", "tickets.manage"],
      {
        any: true,
        message: "Forbidden: Ticket status access required",
      },
    );
    const { user } = await requireAdminOrSupport();

    const { request, kind, collectionName } = await findRequestById(ticketId);
    if (!request || !collectionName || !kind) {
      throw new Error("Ticket not found");
    }

    const ticketsCollection = await getCollection<Ticket>(collectionName);
    const historyCollection = await getCollection("ticket_history");
    const ticket = request as Ticket;

    const oldStatus = ticket.status;
    if (oldStatus === status) {
      return {
        success: true,
        data: JSON.parse(JSON.stringify(ticket)) as Ticket,
        message: "Ticket status unchanged",
      };
    }

    // Update ticket
    const updateData: Record<string, unknown> = {
      status,
      lastActivityAt: new Date(),
    };

    if (status === "resolved" || status === "closed") {
      updateData.resolvedAt = new Date();
    }

    await ticketsCollection.updateOne(
      { _id: new ObjectId(ticketId) },
      { $set: updateData },
    );

    // Keep the AI knowledge index in sync with resolved tickets.
    if (status !== oldStatus) {
      void (async () => {
        try {
          const idx = await import("@/lib/ai/knowledge-index");
          if (status === "resolved") {
            await idx.upsertResolvedTicketEmbedding(ticketId);
          } else if (oldStatus === "resolved") {
            await idx.removeResolvedTicketEmbedding(ticketId);
          }
        } catch (e) {
          console.error("[ai-index] resolved-ticket sync failed", e);
        }
      })();
    }

    // Create history entry
    await historyCollection.insertOne({
      ticketId: new ObjectId(ticketId),
      requestType: kind,
      userId: user.id,
      action: "status_changed",
      changes: {
        status: {
          from: oldStatus,
          to: status,
        },
      },
      createdAt: new Date(),
    });

    // Get updated ticket
    const updatedTicket = await ticketsCollection.findOne({
      _id: new ObjectId(ticketId),
    });

    // Revalidate all relevant paths for this request type
    const paths = getRequestPaths(
      ticketId,
      kind,
      kind === "service" ? (request as Ticket).serviceSlug : undefined,
    );
    revalidatePath(paths.adminList);
    revalidatePath(paths.adminDetail);
    revalidatePath(paths.dashboardList);
    revalidatePath(paths.dashboardDetail);

    // Send email notification to customer (if enabled)
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

      const isResolution = status === "resolved" || status === "closed";
      const shouldSend =
        emailEnabled &&
        (isResolution
          ? settings.email.notifyOnTicketResolution
          : settings.email.notifyOnTicketUpdate);

      if (shouldSend) {
        const { sendEmail, emailTemplates } = await import("@/lib/email");
        const usersCollection = await getCollection("user");

        // Get customer info
        let customer = await usersCollection.findOne({ id: ticket.customerId });

        // Fallbacks for older datasets where 'id' might be missing
        if (!customer) {
          try {
            if (ObjectId.isValid(ticket.customerId)) {
              customer = await usersCollection.findOne({
                _id: new ObjectId(ticket.customerId),
              });
            }
            if (!customer) {
              // Some databases may have stored _id as string
              customer = await usersCollection.findOne({
                _id: ticket.customerId as unknown as ObjectId,
              });
            }
          } catch {
            // Fallback lookup failed
          }
        }

        if (customer && customer.email) {
          const formatStatus = (s: string) => {
            return s
              .split("_")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
          };

          const emailResult = await sendEmail({
            to: customer.email,
            ...emailTemplates.ticketStatusChanged(
              ticket.ticketNumber,
              ticket.title,
              formatStatus(oldStatus),
              formatStatus(status),
              message,
            ),
          });

          if (!emailResult.success) {
            console.error(
              `Failed to send status update email to ${customer.email}:`,
              emailResult.error,
            );
          }
        }
      }
    } catch (emailError) {
      console.error("Failed to send status update email:", emailError);
    }

    // Send real-time notification to customer
    try {
      if (ticket.customerId) {
        const formatStatus = (s: string) => {
          return s
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        };

        // Determine notification type based on ticket category
        let notificationType:
          | "ticket_status"
          | "installation_status"
          | "customization_status" = "ticket_status";
        let notificationTitle = "Ticket Status Updated";
        let notificationUrl = `/dashboard/tickets/${ticketId}`;
        let requestType = "ticket";

        if (ticket.category === "technical_support") {
          notificationType = "installation_status";
          notificationTitle = "Installation Request Status Updated";
          notificationUrl = `/dashboard/installation/${ticketId}`;
          requestType = "installation request";
        } else if (ticket.category === "feature_request") {
          notificationType = "customization_status";
          notificationTitle = "Customization Request Status Updated";
          notificationUrl = `/dashboard/customization/${ticketId}`;
          requestType = "customization request";
        }

        await createNotification({
          userId: ticket.customerId,
          type: notificationType,
          title: notificationTitle,
          body: `Your ${requestType} #${
            ticket.ticketNumber
          } status changed from ${formatStatus(oldStatus)} to ${formatStatus(
            status,
          )}`,
          data: {
            ticketId: ticketId,
            ticketNumber: ticket.ticketNumber,
            oldStatus,
            newStatus: status,
            url: notificationUrl,
            ...(ticket.category === "technical_support" && {
              installationId: ticketId,
            }),
            ...(ticket.category === "feature_request" && {
              customizationId: ticketId,
            }),
          },
        });
      }
    } catch (notificationError) {
      console.error(
        "Failed to send status update notification:",
        notificationError,
      );
      // Don't fail the entire operation if notification fails
    }

    // Serialize ticket to avoid ObjectId serialization issues
    const serializedTicket = JSON.parse(JSON.stringify(updatedTicket));

    return {
      success: true,
      data: serializedTicket as Ticket,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update ticket status";
    console.error("Update ticket status error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Update ticket priority (admin/support only)
export async function updateTicketPriority(
  ticketId: string,
  priority: "low" | "medium" | "high" | "urgent",
): Promise<ApiResponse<Ticket>> {
  try {
    await requirePermissionOrThrow(
      ["tickets.change_priority", "tickets.manage"],
      {
        any: true,
        message: "Forbidden: Ticket priority access required",
      },
    );
    const { user } = await requireAdminOrSupport();

    const { request, kind, collectionName } = await findRequestById(ticketId);
    if (!request || !collectionName || !kind) {
      throw new Error("Ticket not found");
    }

    const ticketsCollection = await getCollection<Ticket>(collectionName);
    const historyCollection = await getCollection("ticket_history");
    const ticket = request as Ticket;

    // Update ticket
    await ticketsCollection.updateOne(
      { _id: new ObjectId(ticketId) },
      {
        $set: {
          priority,
          lastActivityAt: new Date(),
        },
      },
    );

    // Create history entry
    await historyCollection.insertOne({
      ticketId: new ObjectId(ticketId),
      requestType: kind,
      userId: user.id,
      action: "priority_changed",
      changes: {
        priority: {
          from: ticket.priority,
          to: priority,
        },
      },
      createdAt: new Date(),
    });

    // Get updated ticket
    const updatedTicket = await ticketsCollection.findOne({
      _id: new ObjectId(ticketId),
    });

    // Revalidate all relevant paths for this request type
    const paths = getRequestPaths(
      ticketId,
      kind,
      kind === "service" ? (request as Ticket).serviceSlug : undefined,
    );
    revalidatePath(paths.adminList);
    revalidatePath(paths.adminDetail);
    revalidatePath(paths.dashboardList);
    revalidatePath(paths.dashboardDetail);

    // Serialize ticket to avoid ObjectId serialization issues
    const serializedTicket = JSON.parse(JSON.stringify(updatedTicket));

    return {
      success: true,
      data: serializedTicket as Ticket,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to update ticket priority";
    console.error("Update ticket priority error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Get dashboard statistics
export async function getDashboardStats(): Promise<
  ApiResponse<{
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    waitingOnCustomer: number;
    resolvedTickets: number;
    closedTickets: number;
    unassignedTickets: number;
    urgentTickets: number;
    totalUsers: number;
    totalCustomers: number;
    totalSupport: number;
    totalAdmins: number;
    recentUsersCount: number; // Users registered in last 7 days
    avgResponseTime: number;
  }>
> {
  try {
    await requireAdminOrSupport();

    const ticketsCollection = await getCollection("tickets");
    const usersCollection = await getCollection("user");

    // Calculate date for recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get ticket counts and user counts in parallel
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      waitingOnCustomer,
      resolvedTickets,
      closedTickets,
      unassignedTickets,
      urgentTickets,
      totalUsers,
      totalCustomers,
      totalSupport,
      totalAdmins,
      recentUsersCount,
    ] = await Promise.all([
      ticketsCollection.countDocuments(),
      ticketsCollection.countDocuments({ status: "open" }),
      ticketsCollection.countDocuments({ status: "in_progress" }),
      ticketsCollection.countDocuments({ status: "waiting_on_customer" }),
      ticketsCollection.countDocuments({ status: "resolved" }),
      ticketsCollection.countDocuments({ status: "closed" }),
      ticketsCollection.countDocuments({
        $or: [{ assignedToId: null }, { assignedToId: { $exists: false } }],
      }),
      ticketsCollection.countDocuments({ priority: "urgent" }),
      usersCollection.countDocuments(),
      usersCollection.countDocuments({ role: "customer" }),
      usersCollection.countDocuments({ role: "support" }),
      usersCollection.countDocuments({ role: "admin" }),
      usersCollection.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    ]);

    return {
      success: true,
      data: {
        totalTickets,
        openTickets,
        inProgressTickets,
        waitingOnCustomer,
        resolvedTickets,
        closedTickets,
        unassignedTickets,
        urgentTickets,
        totalUsers,
        totalCustomers,
        totalSupport,
        totalAdmins,
        recentUsersCount,
        avgResponseTime: 0, // TODO: Calculate from ticket history
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch dashboard statistics";
    console.error("Get dashboard stats error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Get recent user registrations
export async function getRecentUsers(
  limit: number = 10,
): Promise<ApiResponse<User[]>> {
  try {
    await requireAdminOrSupport();

    const usersCollection = await getCollection("user");

    const users = await usersCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Ensure all users have an id field (fallback to _id.toString() if missing or "undefined")
    const usersWithId = users.map((user) => ({
      ...user,
      id: user.id && user.id !== "undefined" ? user.id : user._id?.toString(),
    }));

    return {
      success: true,
      data: usersWithId as User[],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch recent users";
    console.error("Get recent users error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Get priority distribution
export async function getPriorityDistribution(): Promise<
  ApiResponse<
    {
      priority: string;
      count: number;
    }[]
  >
> {
  try {
    await requireAdminOrSupport();

    const ticketsCollection = await getCollection("tickets");

    const distribution = await ticketsCollection
      .aggregate([
        {
          $group: {
            _id: "$priority",
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            priority: "$_id",
            count: 1,
          },
        },
        {
          $sort: { count: -1 },
        },
      ])
      .toArray();

    return {
      success: true,
      data: distribution as { priority: string; count: number }[],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch priority distribution";
    console.error("Get priority distribution error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Get status distribution
export async function getStatusDistribution(): Promise<
  ApiResponse<
    {
      status: string;
      count: number;
    }[]
  >
> {
  try {
    await requireAdminOrSupport();

    const ticketsCollection = await getCollection("tickets");

    const distribution = await ticketsCollection
      .aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            status: "$_id",
            count: 1,
          },
        },
        {
          $sort: { count: -1 },
        },
      ])
      .toArray();

    return {
      success: true,
      data: distribution as { status: string; count: number }[],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch status distribution";
    console.error("Get status distribution error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// =============================================================================
// USER MANAGEMENT CRUD OPERATIONS
// =============================================================================

/**
 * Hash password using better-auth's crypto module
 * This ensures compatibility with better-auth's authentication
 */
async function hashPassword(password: string): Promise<string> {
  return await betterAuthHashPassword(password);
}

/**
 * Create a new user (admin only)
 */
export async function createUser(
  data: CreateUserFormData,
): Promise<ApiResponse<User>> {
  try {
    await requirePermissionOrThrow("users.manage", {
      message: "Forbidden: Users manage access required",
    });

    // Validate input
    const validatedData = createUserSchema.parse(data);

    const usersCollection = await getCollection("user");

    // Check if user with email already exists
    const existingUser = await usersCollection.findOne({
      email: validatedData.email,
    });

    if (existingUser) {
      return {
        success: false,
        error: "A user with this email already exists",
      };
    }

    // IMPORTANT: Delegate account + user creation to Better Auth itself
    // so that all IDs, account linkage and hashing are 100% correct.
    const { auth } = await import("@/lib/auth");
    const { headers } = await import("next/headers");

    // Create the auth user (does NOT affect current admin session in a Server Action)
    await auth.api.signUpEmail({
      body: {
        email: validatedData.email,
        password: validatedData.password,
        name: validatedData.name,
      },
      // Passing headers is optional, but useful for ip/user-agent attribution
      headers: await headers(),
    });

    // Fetch the created user and set custom fields (role, country)
    const created = await usersCollection.findOne({
      email: validatedData.email,
    });
    if (!created) {
      throw new Error("User was created by auth but could not be fetched back");
    }

    await usersCollection.updateOne(
      { _id: created._id },
      {
        $set: {
          id: created.id || created._id.toString(),
          role: validatedData.role,
          ...(validatedData.rbacRoleId
            ? { rbacRoleId: validatedData.rbacRoleId }
            : {}),
          country: validatedData.country || "",
          ...(validatedData.role === "support" &&
          validatedData.departmentSlugs &&
          validatedData.departmentSlugs.length > 0
            ? { departmentSlugs: validatedData.departmentSlugs }
            : {}),
          updatedAt: new Date(),
        },
        ...(validatedData.rbacRoleId ? {} : { $unset: { rbacRoleId: "" } }),
      },
    );

    const finalUser = await usersCollection.findOne({
      _id: created._id,
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/customers");

    return {
      success: true,
      data: finalUser as User,
      message: "User created successfully",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create user";
    console.error("Create user error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Update a user (admin only)
 */
export async function updateUser(
  userId: string,
  data: UpdateUserFormData,
): Promise<ApiResponse<User>> {
  try {
    await requirePermissionOrThrow("users.manage", {
      message: "Forbidden: Users manage access required",
    });

    // Validate input
    const validatedData = updateUserSchema.parse(data);

    const usersCollection = await getCollection("user");

    // Check if user exists
    const existingUser = await usersCollection.findOne({ id: userId });
    if (!existingUser) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Check if email is being changed and if it's already in use
    if (validatedData.email !== existingUser.email) {
      const emailInUse = await usersCollection.findOne({
        email: validatedData.email,
        id: { $ne: userId },
      });

      if (emailInUse) {
        return {
          success: false,
          error: "A user with this email already exists",
        };
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      name: validatedData.name,
      email: validatedData.email,
      role: validatedData.role,
      country: validatedData.country || "",
      updatedAt: new Date(),
    };

    const unset: Record<string, "" | 1> = {};
    if (validatedData.rbacRoleId && validatedData.rbacRoleId.length > 0) {
      updateData.rbacRoleId = validatedData.rbacRoleId;
    } else {
      unset.rbacRoleId = "";
    }

    // Department coverage only applies to support agents (used for AI
    // auto-assignment). Clear it for other roles.
    if (
      validatedData.role === "support" &&
      validatedData.departmentSlugs &&
      validatedData.departmentSlugs.length > 0
    ) {
      updateData.departmentSlugs = validatedData.departmentSlugs;
    } else {
      unset.departmentSlugs = "";
    }

    // Update password if provided
    if (validatedData.password && validatedData.password.length > 0) {
      const hashedPassword = await hashPassword(validatedData.password);

      // Update password in account collection
      const accountsCollection = await getCollection("account");
      // Prefer updating whichever account doc has a password field
      const credDoc = await accountsCollection.findOne({
        userId: userId,
        password: { $exists: true },
      });
      const filter = credDoc
        ? { _id: credDoc._id }
        : {
            userId: userId,
            providerId: { $in: ["credential", "email"] },
          };
      await accountsCollection.updateOne(
        filter,
        {
          $set: {
            password: hashedPassword,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            userId: userId,
            accountId: userId,
            providerId: "credential",
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
    }

    // Update user
    await usersCollection.updateOne(
      { id: userId },
      Object.keys(unset).length > 0
        ? { $set: updateData, $unset: unset }
        : { $set: updateData },
    );

    // Get updated user
    const updatedUser = await usersCollection.findOne({ id: userId });

    revalidatePath("/admin/users");
    revalidatePath("/admin/customers");
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath(`/admin/customers/${userId}`);

    return {
      success: true,
      data: updatedUser as User,
      message: "User updated successfully",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update user";
    console.error("Update user error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(userId: string): Promise<ApiResponse<void>> {
  try {
    const session = await requirePermissionOrThrow("users.manage", {
      message: "Forbidden: Users manage access required",
    });
    const currentUser = session.user as { id: string };

    // Prevent deleting yourself
    if (currentUser.id === userId) {
      return {
        success: false,
        error: "You cannot delete your own account",
      };
    }

    const usersCollection = await getCollection("user");

    // Check if user exists
    const userToDelete = await usersCollection.findOne({ id: userId });
    if (!userToDelete) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Delete user's account entries
    const accountsCollection = await getCollection("account");
    await accountsCollection.deleteMany({ userId: userId });

    // Delete user's sessions
    const sessionsCollection = await getCollection("session");
    await sessionsCollection.deleteMany({ userId: userId });

    // Note: We're not deleting tickets/comments created by this user
    // to maintain data integrity. You might want to reassign or handle differently.

    // Delete the user
    await usersCollection.deleteOne({ id: userId });

    revalidatePath("/admin/users");
    revalidatePath("/admin/customers");
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath(`/admin/customers/${userId}`);

    return {
      success: true,
      message: "User deleted successfully",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete user";
    console.error("Delete user error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get detailed user information by ID (admin/support only)
 */
export async function getUserDetails(userId: string) {
  try {
    const { user: currentUser, role: currentUserRole } =
      await requireAdminOrSupport();

    const usersCollection = await getCollection("user");
    const ticketsCollection = await getCollection<Ticket>("tickets");

    // Get user - try by id first, then by _id as fallback
    let user = await usersCollection.findOne({ id: userId });
    if (!user && ObjectId.isValid(userId)) {
      user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    }

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Ensure user has an id field
    const userWithId = {
      ...user,
      id: user.id || user._id?.toString(),
    };

    // Use the user's id field for queries (now guaranteed to exist)
    const userIdForQuery = userWithId.id;

    // Get user's tickets
    // Support agents can only see tickets assigned to them or unassigned tickets
    let ticketsQuery: Record<string, unknown> = { customerId: userIdForQuery };
    if (currentUserRole === "support") {
      ticketsQuery = {
        customerId: userIdForQuery,
        $or: [
          { assignedToId: currentUser.id },
          { assignedToId: { $exists: false } },
          { assignedToId: null },
        ],
      };
    }

    const tickets = await ticketsCollection
      .find(ticketsQuery)
      .sort({ createdAt: -1 })
      .toArray();

    // Calculate statistics (ticket-related only for support)
    // Note: "Open Tickets" includes open, in_progress, and waiting_on_customer
    // to match the definition used in getClientUsers()
    const stats = {
      totalTickets: tickets.length,
      openTickets: tickets.filter((t) =>
        ["open", "in_progress", "waiting_on_customer"].includes(t.status),
      ).length,
      inProgressTickets: tickets.filter((t) => t.status === "in_progress")
        .length,
      resolvedTickets: tickets.filter((t) =>
        ["resolved", "closed"].includes(t.status),
      ).length,
      closedTickets: tickets.filter((t) => t.status === "closed").length,
      // Only admins can see session stats
      activeSessions: currentUserRole === "admin" ? 0 : undefined,
    };

    // Only admins can access sessions and account info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sessions: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let account: any = null;

    if (currentUserRole === "admin") {
      const sessionsCollection = await getCollection("session");

      // better-auth stores userId as ObjectId in sessions, but as string in users
      // We need to convert the string ID to ObjectId for the query
      const sessionQuery: Record<string, unknown> = ObjectId.isValid(
        userIdForQuery,
      )
        ? { userId: new ObjectId(userIdForQuery) }
        : { userId: userIdForQuery };

      sessions = await sessionsCollection
        .find(sessionQuery)
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

      // Update active sessions count
      stats.activeSessions = sessions.filter(
        (s) => new Date(s.expiresAt) > new Date(),
      ).length;

      // Get account info
      const accountsCollection = await getCollection("account");
      account = await accountsCollection.findOne({
        userId: userIdForQuery,
        providerId: "credential",
      });
    }

    return {
      success: true,
      data: {
        user: userWithId as User,
        tickets: tickets.map((t) => ({
          ...t,
          id: t._id.toString(),
        })) as Ticket[],
        sessions: sessions.map((s) => ({
          id: s._id?.toString(),
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          expiresAt: s.expiresAt,
          ipAddress: s.ipAddress || "Unknown",
          userAgent: s.userAgent || "Unknown",
        })),
        stats,
        account: account
          ? {
              createdAt: account.createdAt,
              updatedAt: account.updatedAt,
              providerId: account.providerId,
            }
          : null,
        currentUserRole, // Include the current user's role for UI rendering
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch user details";
    console.error("Get user details error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Delete a ticket/request (admin only)
 */
export async function deleteTicket(
  ticketId: string,
): Promise<ApiResponse<void>> {
  try {
    const { role } = await requireAdminOrSupport();
    if (role !== "admin") {
      throw new Error("Forbidden: Admin access required");
    }

    const { request, kind, collectionName } = await findRequestById(ticketId);

    if (!request || !collectionName || !kind) {
      return {
        success: false,
        error: "Ticket not found",
      };
    }

    // Delete the ticket/request from the appropriate collection
    const requestCollection = await getCollection(collectionName);
    await requestCollection.deleteOne({ _id: new ObjectId(ticketId) });

    // Delete associated comments
    const commentsCollection = await getCollection("comments");
    await commentsCollection.deleteMany({ ticketId });

    // Delete associated attachments
    await deleteTicketAttachments(ticketId);

    // Delete associated history
    const historyCollection = await getCollection("ticket_history");
    await historyCollection.deleteMany({ ticketId: new ObjectId(ticketId) });

    // Revalidate paths for this request type
    const paths = getRequestPaths(
      ticketId,
      kind,
      kind === "service" ? (request as Ticket).serviceSlug : undefined,
    );
    revalidatePath(paths.dashboardList);
    revalidatePath(paths.dashboardDetail);
    revalidatePath(paths.adminList);
    revalidatePath(paths.adminDetail);

    return {
      success: true,
      message: "Request deleted successfully",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete request";
    console.error("Delete ticket error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get ticket history
 * Customers can view their own ticket history
 * Admin/Support can view all ticket history
 */
/**
 * Synthetic actors that appear in ticket history but have no `user` record —
 * e.g. the AI support agent that creates and auto-assigns escalation tickets.
 * Mapped to a friendly identity so the Activity Log never shows "Unknown".
 */
const SYSTEM_ACTORS: Record<string, { name: string; email: string }> = {
  "ai-agent": { name: "AI Agent", email: "" },
};

export async function getTicketHistory(
  ticketId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ApiResponse<any[]>> {
  try {
    const session = await getSession();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const userId = session.user.id;
    const role = (session.user as User).role || "customer";

    // Check if request exists (across all collections) and user has access
    const { request } = await findRequestById(ticketId);

    if (!request) {
      return {
        success: false,
        error: "Ticket not found",
      };
    }

    // Customers can only view their own ticket history
    if (role === "customer" && (request as Ticket).customerId !== userId) {
      return {
        success: false,
        error: "Forbidden: You can only view your own ticket history",
      };
    }

    const historyCollection = await getCollection("ticket_history");
    const history = await historyCollection
      .find({ ticketId: new ObjectId(ticketId) })
      .sort({ createdAt: -1 })
      .toArray();

    // Get user information for history entries
    const userIds = [
      ...new Set(
        history.map((h) => (h as unknown as { userId: string }).userId),
      ),
    ];
    const usersCollection = await getCollection("user");
    const stringIds = userIds.filter((id) => typeof id === "string");
    const objectIds = stringIds
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    const usersData = await usersCollection
      .find({
        $or: [
          { id: { $in: stringIds } },
          objectIds.length > 0 ? { _id: { $in: objectIds } } : {},
        ].filter((q) => Object.keys(q).length > 0),
      })
      .toArray();

    const users: Record<
      string,
      { name: string; email: string; role?: string; image?: string }
    > = {};
    usersData.forEach((user) => {
      const key = user.id || user._id.toString();
      users[key] = {
        name: user.name || "Unknown",
        email: user.email || "",
        role: (user as unknown as { role?: string })?.role,
        image: user.image,
      };
    });

    // Enrich history with user data
    const enrichedHistory = history.map((entry) => {
      const e = entry as unknown as { userId: string };
      return {
        ...entry,
        user:
          users[e.userId] ||
          SYSTEM_ACTORS[e.userId] || { name: "Unknown", email: "" },
      };
    });

    // Serialize to plain objects (convert ObjectIds and Dates to strings)
    const serializedHistory = JSON.parse(JSON.stringify(enrichedHistory));

    return {
      success: true,
      data: serializedHistory,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch ticket history";
    console.error("Get ticket history error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// =============================================================================
// BULK ACTIONS
// These power the multi-select toolbar in the data tables. They reuse the
// single-item actions / collections above so all side effects (history,
// notifications, session revocation) stay consistent.
// =============================================================================

const ACCOUNT_STATUSES: AccountStatus[] = ["active", "disabled", "banned"];

/**
 * Bulk-update the account status (active / disabled / banned) for a set of
 * users. Used by the Team Members and Customers tables.
 *
 * - `scope` controls the permission gate: "team" → users.manage,
 *   "customer" → clients.manage.
 * - Disabling or banning revokes the affected users' active sessions so the
 *   change takes effect immediately (login is also blocked in lib/auth.ts).
 * - The acting user can never change their own status (lockout protection).
 */
export async function bulkUpdateUserStatus(
  userIds: string[],
  status: AccountStatus,
  scope: "team" | "customer" = "team",
  reason?: string,
): Promise<ApiResponse<{ count: number }>> {
  try {
    const permission = scope === "customer" ? "clients.manage" : "users.manage";
    const session = await requirePermissionOrThrow(permission, {
      message: `Forbidden: ${scope === "customer" ? "Customer" : "User"} manage access required`,
    });

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return { success: false, error: "No users selected" };
    }
    if (!ACCOUNT_STATUSES.includes(status)) {
      return { success: false, error: "Invalid status" };
    }

    const currentUserId = (session.user as { id: string }).id;
    // Never let an admin change their own status in a bulk operation.
    const targetIds = userIds.filter((id) => id && id !== currentUserId);
    if (targetIds.length === 0) {
      return {
        success: false,
        error: "You cannot change your own account status",
      };
    }

    const usersCollection = await getCollection<User>("user");
    const now = new Date();
    const trimmedReason = reason?.trim();

    const set: Record<string, unknown> = {
      status,
      statusUpdatedAt: now,
      statusUpdatedBy: currentUserId,
      updatedAt: now,
    };
    if (status !== "active" && trimmedReason) {
      set.statusReason = trimmedReason;
    }

    const update: Record<string, unknown> =
      status === "active" || !trimmedReason
        ? { $set: set, $unset: { statusReason: "" } }
        : { $set: set };

    const result = await usersCollection.updateMany(
      { id: { $in: targetIds } },
      update,
    );

    // Immediately revoke sessions for disabled/banned users.
    if (status === "disabled" || status === "banned") {
      const sessionsCollection = await getCollection("session");
      await sessionsCollection.deleteMany({ userId: { $in: targetIds } });
    }

    revalidatePath("/admin/users");
    revalidatePath("/admin/customers");

    const noun = scope === "customer" ? "customer" : "member";
    const verb =
      status === "active"
        ? "activated"
        : status === "disabled"
          ? "disabled"
          : "banned";

    return {
      success: true,
      data: { count: result.modifiedCount },
      message: `${result.modifiedCount} ${noun}${result.modifiedCount === 1 ? "" : "s"} ${verb}`,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update status";
    console.error("Bulk update user status error:", error);
    return { success: false, error: errorMessage };
  }
}

/** Support + admin users that a ticket can be assigned to. */
export async function getAssignableAgents(): Promise<
  ApiResponse<Array<{ id: string; name: string; email: string; role: string }>>
> {
  try {
    await requirePermissionOrThrow(["tickets.assign", "tickets.manage"], {
      any: true,
      message: "Forbidden: Ticket assignment access required",
    });

    const usersCollection = await getCollection<User>("user");
    const agents = await usersCollection
      .find({ role: { $in: ["support", "admin"] } })
      .sort({ name: 1 })
      .toArray();

    const data = agents.map((u) => ({
      id: u.id && u.id !== "undefined" ? u.id : u._id?.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
    }));

    return { success: true, data: JSON.parse(JSON.stringify(data)) };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch agents";
    console.error("Get assignable agents error:", error);
    return { success: false, error: errorMessage };
  }
}

type BulkTicketResult = ApiResponse<{ success: number; failed: number }>;

function summarizeBulk(
  success: number,
  failed: number,
  verb: string,
): BulkTicketResult {
  return {
    success: failed === 0,
    data: { success, failed },
    message: `${success} ticket${success === 1 ? "" : "s"} ${verb}${
      failed > 0 ? `, ${failed} failed` : ""
    }`,
  };
}

/** Apply a status change to many tickets/requests at once. */
export async function bulkUpdateTicketStatus(
  ticketIds: string[],
  status:
    | "open"
    | "scheduled_meeting"
    | "in_progress"
    | "waiting_on_customer"
    | "resolved"
    | "closed",
): Promise<BulkTicketResult> {
  try {
    await requirePermissionOrThrow(["tickets.change_status", "tickets.manage"], {
      any: true,
      message: "Forbidden: Ticket status access required",
    });
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return { success: false, error: "No tickets selected" };
    }

    let success = 0;
    let failed = 0;
    for (const id of ticketIds) {
      const r = await updateTicketStatus(id, status);
      if (r.success) success++;
      else failed++;
    }
    return summarizeBulk(success, failed, "updated");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update tickets";
    console.error("Bulk update ticket status error:", error);
    return { success: false, error: errorMessage };
  }
}

/** Apply a priority change to many tickets/requests at once. */
export async function bulkUpdateTicketPriority(
  ticketIds: string[],
  priority: "low" | "medium" | "high" | "urgent",
): Promise<BulkTicketResult> {
  try {
    await requirePermissionOrThrow(
      ["tickets.change_priority", "tickets.manage"],
      { any: true, message: "Forbidden: Ticket priority access required" },
    );
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return { success: false, error: "No tickets selected" };
    }

    let success = 0;
    let failed = 0;
    for (const id of ticketIds) {
      const r = await updateTicketPriority(id, priority);
      if (r.success) success++;
      else failed++;
    }
    return summarizeBulk(success, failed, "updated");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update tickets";
    console.error("Bulk update ticket priority error:", error);
    return { success: false, error: errorMessage };
  }
}

/** Assign (or unassign, when assignedToId is null) many tickets at once. */
export async function bulkAssignTickets(
  ticketIds: string[],
  assignedToId: string | null,
): Promise<BulkTicketResult> {
  try {
    await requirePermissionOrThrow(["tickets.assign", "tickets.manage"], {
      any: true,
      message: "Forbidden: Ticket assignment access required",
    });
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return { success: false, error: "No tickets selected" };
    }

    let success = 0;
    let failed = 0;
    for (const id of ticketIds) {
      const r = await assignTicket(id, assignedToId);
      if (r.success) success++;
      else failed++;
    }
    return summarizeBulk(success, failed, assignedToId ? "assigned" : "unassigned");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to assign tickets";
    console.error("Bulk assign tickets error:", error);
    return { success: false, error: errorMessage };
  }
}
