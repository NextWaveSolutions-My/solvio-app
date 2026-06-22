"use server";

import { getCollection } from "@/lib/db";
import { getSession, requirePermissionOrThrow } from "@/lib/auth-utils";
import { ObjectId } from "mongodb";
import type {
  ApiResponse,
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  User,
} from "@/types";
import { getRequestCollectionName } from "@/lib/request-utils";
import { toPlainObject } from "@/lib/serialization";

type TicketSearchFilter = {
  $or?: {
    title?: { $regex: string; $options: string };
    description?: { $regex: string; $options: string };
    ticketNumber?: { $regex: string; $options: string };
  }[];
};

type SupportTicketQuery = {
  assignedToId: { $in: string[] };
  category?: TicketCategory | { $nin: TicketCategory[] };
  status?: TicketStatus;
  priority?: TicketPriority;
} & TicketSearchFilter;

async function resolveAssignedToIds(sessionUser: { id: string }) {
  const ids = new Set<string>();
  if (sessionUser?.id) ids.add(sessionUser.id);

  const usersCollection = await getCollection<User>("user");
  const dbUser = await usersCollection.findOne({
    $or: [
      { id: sessionUser.id },
      ObjectId.isValid(sessionUser.id)
        ? { _id: new ObjectId(sessionUser.id) }
        : {},
    ].filter((q) => Object.keys(q).length > 0),
  });

  if (dbUser?.id) ids.add(dbUser.id);
  if (dbUser?._id) ids.add(dbUser._id.toString());

  return [...ids];
}

/**
 * Check if user is a support agent
 */
async function requireSupportAgent() {
  const session = await requirePermissionOrThrow("panel.support.access", {
    message: "Forbidden: Support agent access required",
  });
  const user = session.user;
  const role = (user as { role?: string }).role || "customer";
  return { user, role };
}

/**
 * Get tickets assigned to the current support agent
 */
export async function getMyAssignedTickets(filters?: {
  status?: string;
  priority?: string;
  search?: string;
  category?: string;
}): Promise<ApiResponse<Ticket[]>> {
  try {
    const { user } = await requireSupportAgent();

    const assignedToIds = await resolveAssignedToIds(user as { id: string });
    const baseQuery: SupportTicketQuery = {
      assignedToId: { $in: assignedToIds },
    };

    // Apply filters
    if (filters?.status) {
      baseQuery.status = filters.status as TicketStatus;
    }
    if (filters?.priority) {
      baseQuery.priority = filters.priority as TicketPriority;
    }
    if (filters?.category) {
      baseQuery.category = filters.category as TicketCategory;
    }
    if (filters?.search) {
      baseQuery.$or = [
        { title: { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
        { ticketNumber: { $regex: filters.search, $options: "i" } },
      ];
    }

    const category = filters?.category as TicketCategory | undefined;

    const ticketsCollection = await getCollection<Ticket>("tickets");
    const installationCollection = await getCollection<Ticket>(
      getRequestCollectionName("installation"),
    );
    const customizationCollection = await getCollection<Ticket>(
      getRequestCollectionName("customization"),
    );

    const shouldIncludeTickets =
      !category ||
      (category !== "technical_support" && category !== "feature_request");
    const shouldIncludeInstallation =
      !category || category === "technical_support";
    const shouldIncludeCustomization =
      !category || category === "feature_request";

    const [tickets, installations, customizations] = await Promise.all([
      shouldIncludeTickets
        ? ticketsCollection
            .find(baseQuery)
            .sort({ lastActivityAt: -1 })
            .toArray()
        : Promise.resolve([]),
      shouldIncludeInstallation
        ? installationCollection
            .find(baseQuery)
            .sort({ lastActivityAt: -1 })
            .toArray()
        : Promise.resolve([]),
      shouldIncludeCustomization
        ? customizationCollection
            .find(baseQuery)
            .sort({ lastActivityAt: -1 })
            .toArray()
        : Promise.resolve([]),
    ]);

    const all = [...tickets, ...installations, ...customizations];
    const getTime = (t: Ticket) =>
      t.lastActivityAt instanceof Date
        ? t.lastActivityAt.getTime()
        : new Date(t.lastActivityAt as string | number).getTime();
    all.sort((a, b) => getTime(b) - getTime(a));

    return {
      success: true,
      data: toPlainObject(all as Ticket[]),
    };
  } catch (error: unknown) {
    console.error("Get assigned tickets error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch assigned tickets",
    };
  }
}

/**
 * Get dashboard statistics for support agent
 */
export async function getSupportAgentStats(): Promise<
  ApiResponse<{
    totalAssigned: number;
    openTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    avgResponseTime: number;
  }>
> {
  try {
    const { user } = await requireSupportAgent();

    const assignedToIds = await resolveAssignedToIds(user as { id: string });
    const match = { assignedToId: { $in: assignedToIds } };
    const ticketsCollection = await getCollection<Ticket>("tickets");
    const installationCollection = await getCollection<Ticket>(
      getRequestCollectionName("installation"),
    );
    const customizationCollection = await getCollection<Ticket>(
      getRequestCollectionName("customization"),
    );

    const collections = [
      ticketsCollection,
      installationCollection,
      customizationCollection,
    ];
    const [totalAssigned, openTickets, inProgressTickets, resolvedTickets] =
      await Promise.all([
        Promise.all(collections.map((c) => c.countDocuments(match))).then(
          (xs) => xs.reduce((a, b) => a + b, 0),
        ),
        Promise.all(
          collections.map((c) =>
            c.countDocuments({ ...match, status: "open" }),
          ),
        ).then((xs) => xs.reduce((a, b) => a + b, 0)),
        Promise.all(
          collections.map((c) =>
            c.countDocuments({ ...match, status: "in_progress" }),
          ),
        ).then((xs) => xs.reduce((a, b) => a + b, 0)),
        Promise.all(
          collections.map((c) =>
            c.countDocuments({
              ...match,
              status: { $in: ["resolved", "closed"] },
            }),
          ),
        ).then((xs) => xs.reduce((a, b) => a + b, 0)),
      ]);

    return {
      success: true,
      data: {
        totalAssigned,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        avgResponseTime: 0, // TODO: Calculate from ticket history
      },
    };
  } catch (error: unknown) {
    console.error("Get support agent stats error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch statistics",
    };
  }
}

/**
 * Get customization requests assigned to the support agent
 */
export async function getMyCustomizationRequests(filters?: {
  status?: string;
  priority?: string;
  search?: string;
}): Promise<ApiResponse<Ticket[]>> {
  try {
    const { user } = await requireSupportAgent();
    const assignedToIds = await resolveAssignedToIds(user as { id: string });

    const customizationCollection = await getCollection<Ticket>(
      getRequestCollectionName("customization"),
    );
    const legacyTicketsCollection = await getCollection<Ticket>("tickets");

    const baseQuery: SupportTicketQuery = {
      assignedToId: { $in: assignedToIds },
    };
    const legacyQuery: SupportTicketQuery = {
      assignedToId: { $in: assignedToIds },
      category: "feature_request",
    };

    if (filters?.status) {
      baseQuery.status = filters.status as TicketStatus;
      legacyQuery.status = filters.status as TicketStatus;
    }
    if (filters?.priority) {
      baseQuery.priority = filters.priority as TicketPriority;
      legacyQuery.priority = filters.priority as TicketPriority;
    }
    if (filters?.search) {
      const searchFilter: NonNullable<TicketSearchFilter["$or"]> = [
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
  } catch (error: unknown) {
    console.error("Get assigned customization requests error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch assigned customization requests",
    };
  }
}

/**
 * Get installation requests assigned to the support agent
 */
export async function getMyInstallationRequests(filters?: {
  status?: string;
  priority?: string;
  search?: string;
}): Promise<ApiResponse<Ticket[]>> {
  try {
    const { user } = await requireSupportAgent();
    const assignedToIds = await resolveAssignedToIds(user as { id: string });

    const installationCollection = await getCollection<Ticket>(
      getRequestCollectionName("installation"),
    );
    const legacyTicketsCollection = await getCollection<Ticket>("tickets");

    const baseQuery: SupportTicketQuery = {
      assignedToId: { $in: assignedToIds },
    };
    const legacyQuery: SupportTicketQuery = {
      assignedToId: { $in: assignedToIds },
      category: "technical_support",
    };

    if (filters?.status) {
      baseQuery.status = filters.status as TicketStatus;
      legacyQuery.status = filters.status as TicketStatus;
    }
    if (filters?.priority) {
      baseQuery.priority = filters.priority as TicketPriority;
      legacyQuery.priority = filters.priority as TicketPriority;
    }
    if (filters?.search) {
      const searchFilter: NonNullable<TicketSearchFilter["$or"]> = [
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
  } catch (error: unknown) {
    console.error("Get assigned installation requests error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch assigned installation requests",
    };
  }
}

/**
 * Get service requests (dynamic services) assigned to the support agent
 */
export async function getMyServiceRequests(
  serviceSlug: string,
  filters?: {
    status?: string;
    priority?: string;
    search?: string;
  },
): Promise<ApiResponse<Ticket[]>> {
  try {
    const { user } = await requireSupportAgent();
    const assignedToIds = await resolveAssignedToIds(user as { id: string });

    const serviceCollection = await getCollection<Ticket>("service_requests");

    const query: SupportTicketQuery & { serviceSlug: string } = {
      assignedToId: { $in: assignedToIds },
      category: "service",
      serviceSlug,
    };

    if (filters?.status) {
      query.status = filters.status as TicketStatus;
    }
    if (filters?.priority) {
      query.priority = filters.priority as TicketPriority;
    }
    if (filters?.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
        { ticketNumber: { $regex: filters.search, $options: "i" } },
      ];
    }

    const requests = await serviceCollection
      .find(query)
      .sort({ lastActivityAt: -1 })
      .toArray();

    if (serviceSlug === "customization") {
      const customizationCollection = await getCollection<Ticket>(
        getRequestCollectionName("customization"),
      );
      const legacyTicketsCollection = await getCollection<Ticket>("tickets");

      const customizationQuery: SupportTicketQuery = {
        assignedToId: { $in: assignedToIds },
      };
      const legacyQuery: SupportTicketQuery = {
        assignedToId: { $in: assignedToIds },
        category: "feature_request",
      };

      if (filters?.status) {
        customizationQuery.status = filters.status as TicketStatus;
        legacyQuery.status = filters.status as TicketStatus;
      }
      if (filters?.priority) {
        customizationQuery.priority = filters.priority as TicketPriority;
        legacyQuery.priority = filters.priority as TicketPriority;
      }
      if (filters?.search) {
        const $or = [
          { title: { $regex: filters.search, $options: "i" } },
          { description: { $regex: filters.search, $options: "i" } },
          { ticketNumber: { $regex: filters.search, $options: "i" } },
        ];
        customizationQuery.$or = $or;
        legacyQuery.$or = $or;
      }

      const [customizationRequests, legacyRequests] = await Promise.all([
        customizationCollection.find(customizationQuery).toArray(),
        legacyTicketsCollection.find(legacyQuery).toArray(),
      ]);

      const allRequests = [
        ...(requests as Ticket[]),
        ...(customizationRequests as Ticket[]),
        ...(legacyRequests as Ticket[]),
      ];
      const getTime = (t: Ticket) =>
        t.lastActivityAt instanceof Date ? t.lastActivityAt.getTime() : 0;
      allRequests.sort((a, b) => getTime(b) - getTime(a));

      return { success: true, data: toPlainObject(allRequests as Ticket[]) };
    }

    if (serviceSlug === "installation") {
      const installationCollection = await getCollection<Ticket>(
        getRequestCollectionName("installation"),
      );
      const legacyTicketsCollection = await getCollection<Ticket>("tickets");

      const installationQuery: SupportTicketQuery = {
        assignedToId: { $in: assignedToIds },
      };
      const legacyQuery: SupportTicketQuery = {
        assignedToId: { $in: assignedToIds },
        category: "technical_support",
      };

      if (filters?.status) {
        installationQuery.status = filters.status as TicketStatus;
        legacyQuery.status = filters.status as TicketStatus;
      }
      if (filters?.priority) {
        installationQuery.priority = filters.priority as TicketPriority;
        legacyQuery.priority = filters.priority as TicketPriority;
      }
      if (filters?.search) {
        const $or = [
          { title: { $regex: filters.search, $options: "i" } },
          { description: { $regex: filters.search, $options: "i" } },
          { ticketNumber: { $regex: filters.search, $options: "i" } },
        ];
        installationQuery.$or = $or;
        legacyQuery.$or = $or;
      }

      const [installationRequests, legacyRequests] = await Promise.all([
        installationCollection.find(installationQuery).toArray(),
        legacyTicketsCollection.find(legacyQuery).toArray(),
      ]);

      const allRequests = [
        ...(requests as Ticket[]),
        ...(installationRequests as Ticket[]),
        ...(legacyRequests as Ticket[]),
      ];
      const getTime = (t: Ticket) =>
        t.lastActivityAt instanceof Date ? t.lastActivityAt.getTime() : 0;
      allRequests.sort((a, b) => getTime(b) - getTime(a));

      return { success: true, data: toPlainObject(allRequests as Ticket[]) };
    }

    return { success: true, data: toPlainObject(requests as Ticket[]) };
  } catch (error: unknown) {
    console.error("Get assigned service requests error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch assigned service requests",
    };
  }
}
