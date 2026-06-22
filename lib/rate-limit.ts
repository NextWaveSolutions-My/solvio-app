import { getCollection } from "@/lib/db";

interface RateLimitDoc {
  _id: string;
  count: number;
  createdAt: Date;
  expiresAt: Date;
}

interface CheckRateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

/**
 * Fixed-window rate limiter backed by MongoDB.
 * Window buckets are deterministic (Math.floor(now / windowMs)), so multiple
 * servers converge on the same key without coordination. Documents expire via
 * a TTL index on `expiresAt` — create it once:
 *   db.rate_limits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
 */
export async function checkRateLimit(
  options: CheckRateLimitOptions
): Promise<RateLimitResult> {
  const { key, limit, windowSeconds } = options;
  const windowMs = windowSeconds * 1000;
  const bucket = Math.floor(Date.now() / windowMs);
  const bucketKey = `${key}:${bucket}`;
  const expiresAt = new Date((bucket + 1) * windowMs);

  const col = await getCollection<RateLimitDoc>("rate_limits");
  const result = await col.findOneAndUpdate(
    { _id: bucketKey },
    {
      $inc: { count: 1 },
      $setOnInsert: { createdAt: new Date(), expiresAt },
    },
    { upsert: true, returnDocument: "after" }
  );

  const count = result?.count ?? 1;
  const allowed = count <= limit;
  const remaining = Math.max(0, limit - count);
  const retryAfter = allowed ? 0 : Math.ceil((expiresAt.getTime() - Date.now()) / 1000);

  return { allowed, remaining, retryAfter };
}

export function extractClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
