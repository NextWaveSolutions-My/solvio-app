import { randomBytes } from "crypto";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import type { AISite } from "@/types";

/**
 * Site = a knowledge scope (not a tenant). One admin / one database, but
 * sources can be assigned to a site so the widget embedded on that site answers
 * only from its sources + global ones. These are framework-agnostic helpers
 * (no "use server") shared by the admin actions and the public chat API.
 */

export const SITES_COLLECTION = "ai_sites";

export type ChatScope =
  | { status: "global" }
  | { status: "site"; siteId: string; siteName: string }
  | { status: "denied"; reason: string };

/** Opaque, URL-safe key embedded in the widget snippet. */
export function generateSiteKey(): string {
  return `ste_${randomBytes(16).toString("hex")}`;
}

/**
 * Return `siteId` only if it is a valid id of an existing site; otherwise
 * `undefined` (⇒ Global). Guards create/update paths against bogus or stale
 * ids so a row is never scoped to a site that doesn't exist.
 */
export async function normalizeSiteId(
  siteId?: string | null
): Promise<string | undefined> {
  if (!siteId || !ObjectId.isValid(siteId)) return undefined;
  const col = await getCollection<AISite>(SITES_COLLECTION);
  const found = await col.findOne(
    { _id: new ObjectId(siteId) },
    { projection: { _id: 1 } }
  );
  return found ? siteId : undefined;
}

/**
 * Resolve the embed snippet's `key` into a retrieval scope.
 *
 * Missing key means the deliberate "Global widget" and answers from all
 * knowledge. A provided but invalid/disabled/disallowed key is denied so a
 * broken per-site widget cannot silently fall back to cross-site knowledge.
 */
export async function resolveChatScopeByKey(
  key?: string | null,
  host?: string | null
): Promise<ChatScope> {
  if (!key) return { status: "global" };
  try {
    const col = await getCollection<AISite>(SITES_COLLECTION);
    const site = await col.findOne({ key });
    if (!site || site.enabled === false) {
      return { status: "denied", reason: "This chat widget is not active." };
    }
    if (site.domains && site.domains.length > 0) {
      if (!host) {
        return {
          status: "denied",
          reason: "This chat widget is not authorized for this domain.",
        };
      }
      const allowed = site.domains.some((d) => hostMatches(d, host));
      if (!allowed) {
        return {
          status: "denied",
          reason: "This chat widget is not authorized for this domain.",
        };
      }
    }
    return {
      status: "site",
      siteId: site._id.toString(),
      siteName: site.name,
    };
  } catch {
    return {
      status: "denied",
      reason: "This chat widget could not be verified.",
    };
  }
}

/** Back-compat helper for older call sites that only need the site id. */
export async function resolveSiteIdByKey(
  key?: string | null,
  host?: string | null
): Promise<string | undefined> {
  const scope = await resolveChatScopeByKey(key, host);
  return scope.status === "site" ? scope.siteId : undefined;
}

/** Compare an allowlist entry (origin or bare host) against a request origin. */
function hostMatches(entry: string, host: string): boolean {
  const norm = (v: string) =>
    v
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
  return norm(entry) === norm(host);
}
