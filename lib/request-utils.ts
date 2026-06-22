import { ObjectId } from "mongodb";

import { getCollection, getDb } from "@/lib/db";
import type {
  Ticket,
  InstallationRequest,
  CustomizationRequest,
  TicketCategory,
} from "@/types";

// High-level classification for all request-like items in the system
export type RequestKind =
  | "ticket"
  | "installation"
  | "customization"
  | "service";

export interface RequestLookupResult {
  request: Ticket | InstallationRequest | CustomizationRequest | null;
  kind: RequestKind | null;
  collectionName: string | null;
}

/**
 * Map a TicketCategory to a high-level RequestKind.
 *
 * - "technical_support" -> installation request
 * - "feature_request"   -> customization request
 * - everything else      -> normal support ticket
 */
export function getKindFromCategory(category: TicketCategory): RequestKind {
  if (category === "technical_support") return "installation";
  if (category === "feature_request") return "customization";
  if (category === "service") return "service";
  return "ticket";
}

/**
 * Get the MongoDB collection name for a given RequestKind.
 */
export function getRequestCollectionName(kind: RequestKind): string {
  switch (kind) {
    case "installation":
      return "installation_requests";
    case "customization":
      return "customization_requests";
    case "service":
      return "service_requests";
    default:
      return "tickets";
  }
}

/**
 * Find a request by ID across all request-like collections.
 *
 * This function is used by cross-cutting features (comments, attachments,
 * meetings, history, status updates) so they don't need to know which
 * collection the ID belongs to.
 */
export async function findRequestById(
  id: string,
): Promise<RequestLookupResult> {
  if (!ObjectId.isValid(id)) {
    return { request: null, kind: null, collectionName: null };
  }

  const objectId = new ObjectId(id);

  // 1) Try unified tickets collection first (backwards compatibility)
  const ticketsCollection = await getCollection<Ticket>("tickets");
  const ticket = await ticketsCollection.findOne({ _id: objectId });
  if (ticket) {
    const kind = getKindFromCategory(ticket.category);
    return { request: ticket, kind, collectionName: "tickets" };
  }

  // 2) Installation requests collection
  const installationCollection = await getCollection<InstallationRequest>(
    "installation_requests",
  );
  const installation = await installationCollection.findOne({ _id: objectId });
  if (installation) {
    return {
      request: installation,
      kind: "installation",
      collectionName: "installation_requests",
    };
  }

  // 3) Customization requests collection
  const customizationCollection = await getCollection<CustomizationRequest>(
    "customization_requests",
  );
  const customization = await customizationCollection.findOne({
    _id: objectId,
  });
  if (customization) {
    return {
      request: customization,
      kind: "customization",
      collectionName: "customization_requests",
    };
  }

  // 4) Service requests collection (dynamic services)
  const serviceRequestsCollection =
    await getCollection<Ticket>("service_requests");
  const serviceRequest = await serviceRequestsCollection.findOne({
    _id: objectId,
  });
  if (serviceRequest) {
    return {
      request: serviceRequest,
      kind: "service",
      collectionName: "service_requests",
    };
  }

  return { request: null, kind: null, collectionName: null };
}

/**
 * Compute the base dashboard/admin/support paths for a given request kind.
 *
 * This is used so cross-cutting features (attachments, status updates, etc.)
 * can revalidate and build URLs without hard-coding paths in many places.
 */
export function getRequestPaths(
  id: string,
  kind: RequestKind,
  serviceSlug?: string,
): {
  dashboardDetail: string;
  dashboardList: string;
  adminDetail: string;
  adminList: string;
  supportDetail: string;
  supportList: string;
} {
  switch (kind) {
    case "installation":
      return {
        dashboardDetail: `/dashboard/services/installation/${id}`,
        dashboardList: "/dashboard/services/installation",
        adminDetail: `/admin/services/installation/${id}`,
        adminList: "/admin/services/installation",
        supportDetail: `/support-agent/services/installation/${id}`,
        supportList: "/support-agent/services/installation",
      };
    case "customization":
      return {
        dashboardDetail: `/dashboard/services/customization/${id}`,
        dashboardList: "/dashboard/services/customization",
        adminDetail: `/admin/services/customization/${id}`,
        adminList: "/admin/services/customization",
        supportDetail: `/support-agent/services/customization/${id}`,
        supportList: "/support-agent/services/customization",
      };
    case "service": {
      const slug = serviceSlug ?? "service";
      return {
        dashboardDetail: `/dashboard/services/${slug}/${id}`,
        dashboardList: `/dashboard/services/${slug}`,
        adminDetail: `/admin/services/${slug}/${id}`,
        adminList: `/admin/services/${slug}`,
        supportDetail: `/support-agent/services/${slug}/${id}`,
        supportList: `/support-agent/services/${slug}`,
      };
    }
    default:
      return {
        dashboardDetail: `/dashboard/tickets/${id}`,
        dashboardList: "/dashboard/tickets",
        adminDetail: `/admin/tickets/${id}`,
        adminList: "/admin/tickets",
        supportDetail: `/support-agent/tickets/${id}`,
        supportList: "/support-agent/tickets",
      };
  }
}

/**
 * Helper used by ticket number generation to count all request-like
 * documents across collections. This ensures ticketNumber remains unique
 * even after splitting installation/customization into separate collections.
 */
export async function countAllRequests(): Promise<number> {
  const db = await getDb();

  const [ticketsCount, installationCount, customizationCount, serviceCount] =
    await Promise.all([
      db.collection("tickets").countDocuments(),
      db.collection("installation_requests").countDocuments(),
      db.collection("customization_requests").countDocuments(),
      db.collection("service_requests").countDocuments(),
    ]);

  return ticketsCount + installationCount + customizationCount + serviceCount;
}

/**
 * Race-free ticket number generator. The previous count+1 approach could
 * produce duplicate numbers under concurrent creation; this uses an atomic
 * `$inc` on a single counter document (seeded once from the existing count).
 */
export async function generateTicketNumberAtomic(
  prefix: string
): Promise<string> {
  const db = await getDb();
  const counters = db.collection<{ _id: string; seq: number }>("counters");

  // Seed the counter from the current total exactly once.
  const existing = await counters.findOne({ _id: "ticket" });
  if (!existing) {
    const base = await countAllRequests();
    await counters.updateOne(
      { _id: "ticket" },
      { $setOnInsert: { seq: base } },
      { upsert: true }
    );
  }

  const res = await counters.findOneAndUpdate(
    { _id: "ticket" },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );
  const seq = res?.seq ?? 1;
  return `${prefix}-${String(seq).padStart(4, "0")}`;
}
