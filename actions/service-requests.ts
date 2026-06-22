"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCollection } from "@/lib/db";
import {
  getSession,
  requireAuth,
  requireAdminOrSupport,
} from "@/lib/auth-utils";
import {
  countAllRequests,
  findRequestById,
  getRequestPaths,
} from "@/lib/request-utils";
import { createTicketSchema } from "@/lib/validations";
import { toPlainObject } from "@/lib/serialization";
import type {
  ApiResponse,
  CustomizationRequest,
  InstallationRequest,
  Service,
  Ticket,
  TicketPriority,
  UserRole,
} from "@/types";

async function generateTicketNumber(): Promise<string> {
  const { getSystemSettings } = await import("@/lib/settings-utils");
  const settings = await getSystemSettings();
  const prefix =
    settings.tickets.ticketNumberPrefix ||
    process.env.TICKET_NUMBER_PREFIX ||
    "TICKET";
  const count = await countAllRequests();
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

async function getUserRole(): Promise<UserRole> {
  const session = await getSession();
  const user = session?.user as { role?: UserRole } | undefined;
  return user?.role ?? "customer";
}

async function ensureServiceExistsForRole(serviceSlug: string, role: UserRole) {
  const servicesCollection = await getCollection<Service>("services");
  const service = await servicesCollection.findOne({
    slug: serviceSlug,
    isActive: true,
    roles: role,
  });
  if (!service) throw new Error("Service not found");
  return service;
}

async function resolveServiceAssignment(serviceSlug: string) {
  const { validateTicketDepartmentForTicketCreation } = await import(
    "@/lib/ticket-departments"
  );
  const departmentCheck =
    await validateTicketDepartmentForTicketCreation(serviceSlug);
  const departmentSlug = departmentCheck.ok ? serviceSlug : undefined;
  const { assignByDepartment } = await import("@/lib/ai/assign-by-department");

  return {
    departmentSlug,
    assignedToId: await assignByDepartment(departmentSlug),
  };
}

async function sendServiceAssignmentNotifications(params: {
  assignedToId?: string | null;
  ticketId: string;
  ticket: Pick<Ticket, "ticketNumber" | "title">;
  supportUrl: string;
  absoluteSupportUrl: string;
}) {
  if (!params.assignedToId) return;

  const { createNotification } = await import("@/lib/notifications");
  await createNotification({
    userId: params.assignedToId,
    type: "ticket_assignment",
    title: "Service Request Assigned to You",
    body: `You have been assigned to service request #${params.ticket.ticketNumber}: ${params.ticket.title}`,
    data: {
      ticketId: params.ticketId,
      ticketNumber: params.ticket.ticketNumber,
      url: params.supportUrl,
    },
  });

  const { sendTicketAssignmentEmail } = await import(
    "@/lib/ticket-email-notifications"
  );
  await sendTicketAssignmentEmail({
    assigneeId: params.assignedToId,
    ticket: params.ticket,
    ticketUrl: params.absoluteSupportUrl,
  });
}

type ServiceListFilters = {
  status?: string;
  priority?: string;
  search?: string;
};

function applyListFilters(
  query: Record<string, unknown>,
  filters?: ServiceListFilters,
) {
  if (filters?.status) query.status = filters.status;
  if (filters?.priority) query.priority = filters.priority;
  if (filters?.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: "i" } },
      { description: { $regex: filters.search, $options: "i" } },
      { ticketNumber: { $regex: filters.search, $options: "i" } },
    ];
  }
}

function sortByLastActivityDesc(a: Ticket, b: Ticket) {
  const at = a.lastActivityAt instanceof Date ? a.lastActivityAt.getTime() : 0;
  const bt = b.lastActivityAt instanceof Date ? b.lastActivityAt.getTime() : 0;
  return bt - at;
}

export async function getServiceRequestsForAdmin(
  serviceSlug: string,
  filters?: ServiceListFilters,
): Promise<ApiResponse<Ticket[]>> {
  try {
    await requireAdminOrSupport();
    const role = await getUserRole();
    await ensureServiceExistsForRole(serviceSlug, role);

    const serviceCollection = await getCollection<Ticket>("service_requests");
    const serviceQuery: Record<string, unknown> = {
      category: "service",
      serviceSlug,
    };
    applyListFilters(serviceQuery, filters);

    if (serviceSlug === "customization") {
      const customizationCollection = await getCollection<CustomizationRequest>(
        "customization_requests",
      );
      const legacyTicketsCollection = await getCollection<Ticket>("tickets");

      const customizationQuery: Record<string, unknown> = {};
      const legacyQuery: Record<string, unknown> = {
        category: "feature_request",
      };
      applyListFilters(customizationQuery, filters);
      applyListFilters(legacyQuery, filters);

      const [serviceRequests, customizationRequests, legacyRequests] =
        await Promise.all([
          serviceCollection.find(serviceQuery).toArray(),
          customizationCollection.find(customizationQuery).toArray(),
          legacyTicketsCollection.find(legacyQuery).toArray(),
        ]);

      const merged = [
        ...serviceRequests,
        ...(customizationRequests as unknown as Ticket[]),
        ...legacyRequests,
      ];
      merged.sort(sortByLastActivityDesc);
      return { success: true, data: toPlainObject(merged as Ticket[]) };
    }

    if (serviceSlug === "installation") {
      const installationCollection = await getCollection<InstallationRequest>(
        "installation_requests",
      );
      const legacyTicketsCollection = await getCollection<Ticket>("tickets");

      const installationQuery: Record<string, unknown> = {};
      const legacyQuery: Record<string, unknown> = {
        category: "technical_support",
      };
      applyListFilters(installationQuery, filters);
      applyListFilters(legacyQuery, filters);

      const [serviceRequests, installationRequests, legacyRequests] =
        await Promise.all([
          serviceCollection.find(serviceQuery).toArray(),
          installationCollection.find(installationQuery).toArray(),
          legacyTicketsCollection.find(legacyQuery).toArray(),
        ]);

      const merged = [
        ...serviceRequests,
        ...(installationRequests as unknown as Ticket[]),
        ...legacyRequests,
      ];
      merged.sort(sortByLastActivityDesc);
      return { success: true, data: toPlainObject(merged as Ticket[]) };
    }

    const requests = await serviceCollection
      .find(serviceQuery)
      .sort({ lastActivityAt: -1 })
      .toArray();
    return { success: true, data: toPlainObject(requests as Ticket[]) };
  } catch (error: unknown) {
    console.error("Get service requests (admin) error:", error);
    return {
      success: false,
      error: getErrorMessage(error) || "Failed to fetch requests",
    };
  }
}

export async function getMyServiceRequests(
  serviceSlug: string,
  filters?: ServiceListFilters,
): Promise<ApiResponse<Ticket[]>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const role = await getUserRole();

    await ensureServiceExistsForRole(serviceSlug, role);

    const serviceCollection = await getCollection<Ticket>("service_requests");
    const serviceQuery: Record<string, unknown> = {
      category: "service",
      serviceSlug,
      customerId: userId,
    };
    applyListFilters(serviceQuery, filters);

    if (serviceSlug === "customization") {
      const customizationCollection = await getCollection<CustomizationRequest>(
        "customization_requests",
      );
      const legacyTicketsCollection = await getCollection<Ticket>("tickets");

      const customizationQuery: Record<string, unknown> = {
        customerId: userId,
      };
      const legacyQuery: Record<string, unknown> = {
        category: "feature_request",
        customerId: userId,
      };
      applyListFilters(customizationQuery, filters);
      applyListFilters(legacyQuery, filters);

      const [serviceRequests, customizationRequests, legacyRequests] =
        await Promise.all([
          serviceCollection.find(serviceQuery).toArray(),
          customizationCollection.find(customizationQuery).toArray(),
          legacyTicketsCollection.find(legacyQuery).toArray(),
        ]);

      const merged = [
        ...serviceRequests,
        ...(customizationRequests as unknown as Ticket[]),
        ...legacyRequests,
      ];
      merged.sort(sortByLastActivityDesc);
      return { success: true, data: toPlainObject(merged as Ticket[]) };
    }

    if (serviceSlug === "installation") {
      const installationCollection = await getCollection<InstallationRequest>(
        "installation_requests",
      );
      const legacyTicketsCollection = await getCollection<Ticket>("tickets");

      const installationQuery: Record<string, unknown> = { customerId: userId };
      const legacyQuery: Record<string, unknown> = {
        category: "technical_support",
        customerId: userId,
      };
      applyListFilters(installationQuery, filters);
      applyListFilters(legacyQuery, filters);

      const [serviceRequests, installationRequests, legacyRequests] =
        await Promise.all([
          serviceCollection.find(serviceQuery).toArray(),
          installationCollection.find(installationQuery).toArray(),
          legacyTicketsCollection.find(legacyQuery).toArray(),
        ]);

      const merged = [
        ...serviceRequests,
        ...(installationRequests as unknown as Ticket[]),
        ...legacyRequests,
      ];
      merged.sort(sortByLastActivityDesc);
      return { success: true, data: toPlainObject(merged as Ticket[]) };
    }

    const requests = await serviceCollection
      .find(serviceQuery)
      .sort({ lastActivityAt: -1 })
      .toArray();
    return { success: true, data: toPlainObject(requests as Ticket[]) };
  } catch (error: unknown) {
    console.error("Get my service requests error:", error);
    return {
      success: false,
      error: getErrorMessage(error) || "Failed to fetch requests",
    };
  }
}

const createServiceRequestSchema = createTicketSchema
  .omit({ category: true })
  .extend({
    priority: z.enum(["low", "medium", "high", "urgent"]),
  });

export async function createServiceRequest(
  serviceSlug: string,
  data: Omit<z.infer<typeof createServiceRequestSchema>, "category">,
): Promise<ApiResponse<Ticket>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const role = await getUserRole();

    await ensureServiceExistsForRole(serviceSlug, role);

    const validatedData = createServiceRequestSchema.parse(data);

    const ticketNumber = await generateTicketNumber();
    const now = new Date();
    const { assignedToId, departmentSlug } =
      await resolveServiceAssignment(serviceSlug);

    const ticket: Omit<Ticket, "_id"> = {
      ticketNumber,
      title: validatedData.title,
      description: validatedData.description,
      status: "open",
      priority: validatedData.priority as TicketPriority,
      category: "service",
      serviceSlug,
      departmentSlug,
      customerId: userId,
      assignedToId: assignedToId || undefined,
      productName: validatedData.productName,
      productVersion: validatedData.productVersion,
      purchaseCode: validatedData.purchaseCode,
      tags: [],
      timezone: validatedData.timezone,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };

    const collection = await getCollection<Ticket>("service_requests");
    const result = await collection.insertOne(ticket as unknown as Ticket);
    const insertedId = result.insertedId;

    const historyCollection = await getCollection("ticket_history");
    const historyEntries: Record<string, unknown>[] = [
      {
        ticketId: insertedId,
        requestType: "service",
        userId,
        action: "created",
        createdAt: now,
      },
    ];
    if (assignedToId) {
      historyEntries.push({
        ticketId: insertedId,
        requestType: "service",
        userId: "ai-agent",
        action: "assigned",
        newValue: assignedToId,
        metadata: {
          assignedBy: "auto_department_routing",
          departmentSlug,
          serviceSlug,
        },
        createdAt: now,
      });
    }
    await historyCollection.insertMany(historyEntries);

    const paths = getRequestPaths(
      insertedId.toString(),
      "service",
      serviceSlug,
    );
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    revalidatePath(paths.dashboardList);
    revalidatePath(paths.dashboardDetail);
    revalidatePath(paths.adminList);
    revalidatePath(paths.adminDetail);

    try {
      await sendServiceAssignmentNotifications({
        assignedToId,
        ticketId: insertedId.toString(),
        ticket,
        supportUrl: paths.supportDetail,
        absoluteSupportUrl: `${baseUrl}${paths.supportDetail}`,
      });
    } catch (assignmentNotificationError) {
      console.error(
        "Failed to send service assignment notification:",
        assignmentNotificationError,
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
        kind: "service",
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
        "Failed to send Slack/Discord service request notifications:",
        integrationError,
      );
    }

    try {
      const usersCollection = await getCollection("user");
      const customer = await usersCollection.findOne({ id: userId });
      const { sendEmail, emailTemplates, shouldSendEmailNotification } =
        await import("@/lib/email");
      const { enabled: sendNewTicketEmail } =
        await shouldSendEmailNotification("newTicket");
      const customerEmail = customer?.email || session.user.email || undefined;

      if (sendNewTicketEmail && customerEmail) {
        const emailResult = await sendEmail({
          to: customerEmail,
          ...emailTemplates.ticketCreated(ticketNumber, validatedData.title),
        });
        if (!emailResult.success) {
          console.error(
            `Failed to send service request creation email to ${customerEmail}:`,
            emailResult.error,
          );
        }
      }

      const { sendAdminNewTicketEmails } = await import(
        "@/lib/ticket-email-notifications"
      );
      await sendAdminNewTicketEmails({
        ticket: { ...ticket, _id: insertedId } as Ticket,
        customerName: customer?.name || session.user.name || "Unknown",
        customerEmail: customerEmail || "Unknown",
        customerCountry: customer?.country,
        ticketUrl: `${baseUrl}${paths.adminDetail}`,
      });
    } catch (emailError) {
      console.error("Failed to send service request creation emails:", emailError);
    }

    try {
      const [{ getUserIdsByRole }, { createBulkNotifications }] =
        await Promise.all([
          import("@/lib/user-utils"),
          import("@/lib/notifications"),
        ]);
      const adminIds = await getUserIdsByRole(["admin"]);

      if (adminIds.length > 0) {
        await createBulkNotifications(adminIds, {
          type: "new_ticket",
          title: "New Service Request",
          body: `${session.user.name} created service request #${ticketNumber}: ${validatedData.title}`,
          data: {
            ticketId: insertedId.toString(),
            ticketNumber,
            url: paths.adminDetail,
          },
        });
      }
    } catch (notificationError) {
      console.error(
        "Failed to send service request admin notifications:",
        notificationError,
      );
    }

    const serializedTicket = {
      ...ticket,
      _id: insertedId.toString(),
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      lastActivityAt: ticket.lastActivityAt.toISOString(),
    };

    return {
      success: true,
      data: serializedTicket as unknown as Ticket,
    };
  } catch (error: unknown) {
    console.error("Create service request error:", error);
    return {
      success: false,
      error: getErrorMessage(error) || "Failed to create request",
    };
  }
}

const createServiceRequestForStaffSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  productName: z.string().optional(),
  productVersion: z.string().optional(),
  purchaseCode: z.string().optional(),
  timezone: z.string().optional(),
});

export async function createServiceRequestForStaff(
  serviceSlug: string,
  data: z.infer<typeof createServiceRequestForStaffSchema>,
): Promise<ApiResponse<Ticket>> {
  try {
    const session = await requireAdminOrSupport();
    const userId =
      (session.user as { id?: string } | undefined)?.id ?? "unknown";
    const role = await getUserRole();

    await ensureServiceExistsForRole(serviceSlug, role);

    const validatedData = createServiceRequestForStaffSchema.parse(data);

    const ticketNumber = await generateTicketNumber();
    const now = new Date();
    const { assignedToId, departmentSlug } =
      await resolveServiceAssignment(serviceSlug);

    const ticket: Omit<Ticket, "_id"> = {
      ticketNumber,
      title: validatedData.title,
      description: validatedData.description,
      status: "open",
      priority: validatedData.priority,
      category: "service",
      serviceSlug,
      departmentSlug,
      customerId: validatedData.customerId,
      assignedToId: assignedToId || undefined,
      productName: validatedData.productName,
      productVersion: validatedData.productVersion,
      purchaseCode: validatedData.purchaseCode,
      tags: [],
      timezone: validatedData.timezone,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };

    const collection = await getCollection<Ticket>("service_requests");
    const result = await collection.insertOne(ticket as unknown as Ticket);
    const insertedId = result.insertedId;

    const historyCollection = await getCollection("ticket_history");
    const historyEntries: Record<string, unknown>[] = [
      {
        ticketId: insertedId,
        requestType: "service",
        userId,
        action: "created",
        createdAt: now,
      },
    ];
    if (assignedToId) {
      historyEntries.push({
        ticketId: insertedId,
        requestType: "service",
        userId: "ai-agent",
        action: "assigned",
        newValue: assignedToId,
        metadata: {
          assignedBy: "auto_department_routing",
          departmentSlug,
          serviceSlug,
        },
        createdAt: now,
      });
    }
    await historyCollection.insertMany(historyEntries);

    const paths = getRequestPaths(
      insertedId.toString(),
      "service",
      serviceSlug,
    );
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    revalidatePath(paths.dashboardList);
    revalidatePath(paths.dashboardDetail);
    revalidatePath(paths.adminList);
    revalidatePath(paths.adminDetail);
    revalidatePath(paths.supportList);
    revalidatePath(paths.supportDetail);

    try {
      await sendServiceAssignmentNotifications({
        assignedToId,
        ticketId: insertedId.toString(),
        ticket,
        supportUrl: paths.supportDetail,
        absoluteSupportUrl: `${baseUrl}${paths.supportDetail}`,
      });
    } catch (assignmentNotificationError) {
      console.error(
        "Failed to send service assignment notification:",
        assignmentNotificationError,
      );
    }

    try {
      const usersCollection = await getCollection("user");
      const customer = await usersCollection.findOne({
        id: validatedData.customerId,
      });
      const { sendNewTicketIntegrationNotifications } = await import(
        "@/lib/ticket-integrations"
      );

      await sendNewTicketIntegrationNotifications({
        ticket: { ...ticket, _id: insertedId } as Ticket,
        kind: "service",
        actorName: session.user.name || "Support",
        actorRole: role,
        customerName: customer?.name || "Unknown",
        customerEmail: customer?.email || undefined,
        customerCountry: customer?.country,
        adminUrl: `${baseUrl}${paths.adminDetail}`,
        dashboardUrl: `${baseUrl}${paths.dashboardDetail}`,
      });
    } catch (integrationError) {
      console.error(
        "Failed to send Slack/Discord service request notifications:",
        integrationError,
      );
    }

    try {
      const usersCollection = await getCollection("user");
      const customer = await usersCollection.findOne({
        id: validatedData.customerId,
      });
      const { sendEmail, emailTemplates, shouldSendEmailNotification } =
        await import("@/lib/email");
      const { enabled: sendNewTicketEmail } =
        await shouldSendEmailNotification("newTicket");

      if (sendNewTicketEmail && customer?.email) {
        const emailResult = await sendEmail({
          to: customer.email,
          ...emailTemplates.ticketCreated(ticketNumber, validatedData.title),
        });
        if (!emailResult.success) {
          console.error(
            `Failed to send service request creation email to ${customer.email}:`,
            emailResult.error,
          );
        }
      }

      const { sendAdminNewTicketEmails } = await import(
        "@/lib/ticket-email-notifications"
      );
      await sendAdminNewTicketEmails({
        ticket: { ...ticket, _id: insertedId } as Ticket,
        customerName: customer?.name || "Unknown",
        customerEmail: customer?.email || "Unknown",
        customerCountry: customer?.country,
        ticketUrl: `${baseUrl}${paths.adminDetail}`,
      });
    } catch (emailError) {
      console.error("Failed to send service request creation emails:", emailError);
    }

    try {
      const [{ getUserIdsByRole }, { createBulkNotifications, createNotification }] =
        await Promise.all([
          import("@/lib/user-utils"),
          import("@/lib/notifications"),
        ]);

      await createNotification({
        userId: validatedData.customerId,
        type: "new_ticket",
        title: "New Service Request Created",
        body: `A service request has been created for you: ${validatedData.title}`,
        data: {
          ticketId: insertedId.toString(),
          ticketNumber,
          url: paths.dashboardDetail,
        },
      });

      const adminIds = await getUserIdsByRole(["admin"]);
      const otherAdminIds = adminIds.filter((id) => id !== userId);

      if (otherAdminIds.length > 0) {
        await createBulkNotifications(otherAdminIds, {
          type: "new_ticket",
          title: "New Service Request",
          body: `${session.user.name} created service request #${ticketNumber}: ${validatedData.title}`,
          data: {
            ticketId: insertedId.toString(),
            ticketNumber,
            url: paths.adminDetail,
          },
        });
      }
    } catch (notificationError) {
      console.error(
        "Failed to send service request notifications:",
        notificationError,
      );
    }

    const serializedTicket = {
      ...ticket,
      _id: insertedId.toString(),
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      lastActivityAt: ticket.lastActivityAt.toISOString(),
    };

    return {
      success: true,
      data: serializedTicket as unknown as Ticket,
    };
  } catch (error: unknown) {
    console.error("Create service request (staff) error:", error);
    return {
      success: false,
      error: getErrorMessage(error) || "Failed to create request",
    };
  }
}

export async function updateServiceContent(
  ticketId: string,
  serviceSlug: string,
  data: {
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
    productName?: string;
    productVersion?: string;
  },
): Promise<ApiResponse<Ticket>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const role = await getUserRole();

    await ensureServiceExistsForRole(serviceSlug, role);

    const validatedData = z
      .object({
        title: z.string().min(5).max(200),
        description: z.string().min(20).max(5000),
        priority: z.enum(["low", "medium", "high", "urgent"]),
        productName: z.string().optional(),
        productVersion: z.string().optional(),
      })
      .parse(data);

    const lookup = await findRequestById(ticketId);
    const ticket = lookup.request;

    if (!ticket || !lookup.kind || !lookup.collectionName) {
      return { success: false, error: "Service request not found" };
    }

    const isMatchingService =
      (lookup.kind === "service" &&
        (ticket as Ticket).serviceSlug === serviceSlug) ||
      (lookup.kind === "customization" && serviceSlug === "customization") ||
      (lookup.kind === "installation" && serviceSlug === "installation");
    if (!isMatchingService)
      return { success: false, error: "Service request not found" };

    if (role === "customer" && ticket.customerId !== userId) {
      return {
        success: false,
        error: "You don't have permission to update this request",
      };
    }

    const now = new Date();
    const updateData: Partial<Ticket> & {
      updatedAt: Date;
      lastActivityAt: Date;
    } = {
      title: validatedData.title,
      description: validatedData.description,
      priority: validatedData.priority,
      productName: validatedData.productName,
      productVersion: validatedData.productVersion,
      updatedAt: now,
      lastActivityAt: now,
    };

    const requestsCollection = await getCollection<Ticket>(
      lookup.collectionName,
    );
    const result = await requestsCollection.findOneAndUpdate(
      { _id: new ObjectId(ticketId) },
      { $set: updateData },
      { returnDocument: "after" },
    );

    const updated =
      (result as unknown as { value: Ticket | null }).value ??
      (ticket as Ticket);

    const historyCollection = await getCollection("ticket_history");
    await historyCollection.insertOne({
      ticketId: new ObjectId(ticketId),
      requestType: lookup.kind,
      userId,
      action: "updated",
      createdAt: now,
    });

    const paths = getRequestPaths(
      ticketId.toString(),
      lookup.kind,
      lookup.kind === "service" ? serviceSlug : undefined,
    );
    revalidatePath(paths.dashboardList);
    revalidatePath(paths.dashboardDetail);
    revalidatePath(`${paths.dashboardDetail}/edit`);
    revalidatePath(paths.adminList);
    revalidatePath(paths.adminDetail);
    revalidatePath(paths.supportList);
    revalidatePath(paths.supportDetail);

    const serializedTicket = JSON.parse(
      JSON.stringify(updated),
    ) as unknown as Ticket;
    return { success: true, data: serializedTicket };
  } catch (error: unknown) {
    console.error("Update service request error:", error);
    return {
      success: false,
      error: getErrorMessage(error) || "Failed to update request",
    };
  }
}
