import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types";
import type { Permission } from "@/types/rbac";
import { getEffectivePermissions, hasPermissions } from "@/lib/rbac";

/**
 * Get the current session on the server side
 * Returns null if not authenticated
 */
export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Treat disabled/banned users as logged-out everywhere. Their active
  // sessions are revoked when status changes, but this is the safety net
  // that covers any lingering session / freshly-issued cookie.
  if (session?.user) {
    const status = (session.user as { status?: string }).status;
    if (status === "disabled" || status === "banned") {
      return null;
    }
  }

  return session;
}

/**
 * Require authentication - redirects to login if not authenticated
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

/**
 * Require specific role - redirects to unauthorized page if role doesn't match
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const session = await requireAuth();

  const user = session.user as any | undefined;
  const userRole = user?.role as UserRole | undefined;

  if (!userRole || !allowedRoles.includes(userRole)) {
    redirect("/unauthorized");
  }

  return session;
}

/**
 * Check if user has admin or support role
 */
export async function isAdminOrSupport() {
  const session = await getSession();
  if (!session?.user) return false;

  const userRole = (session.user as any)?.role as UserRole | undefined;
  return userRole === "admin" || userRole === "support";
}

/**
 * Check if user has admin role
 */
export async function isAdmin() {
  const session = await getSession();
  if (!session?.user) return false;

  const userRole = (session.user as any)?.role as UserRole | undefined;
  return userRole === "admin";
}

/**
 * Require admin or support role - throws error if not authorized
 */
export async function requireAdminOrSupport() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  const user = session.user;
  const role = (user as any)?.role ?? "customer";
  if (role !== "admin" && role !== "support") {
    throw new Error("Forbidden: Admin or support access required");
  }
  return session;
}

export async function getViewerPermissions() {
  const session = await getSession();
  if (!session?.user) return [];
  const user = session.user as any;
  const baseRole = (user?.role as UserRole) || "customer";
  const effective = await getEffectivePermissions({
    userId: user.id,
    baseRole,
  });
  return Array.from(effective);
}

export async function requirePermission(
  required: Permission | Permission[],
  options?: { any?: boolean }
) {
  const session = await requireAuth();
  const user = session.user as any;
  const baseRole = (user?.role as UserRole) || "customer";

  const effective = await getEffectivePermissions({
    userId: user.id,
    baseRole,
  });

  const ok = hasPermissions(effective, required, options?.any ? "any" : "all");
  if (!ok) {
    redirect("/unauthorized");
  }

  return session;
}

export async function requirePermissionOrThrow(
  required: Permission | Permission[],
  options?: { any?: boolean; message?: string }
) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  const user = session.user as any;
  const baseRole = (user?.role as UserRole) || "customer";

  const effective = await getEffectivePermissions({
    userId: user.id,
    baseRole,
  });

  const ok = hasPermissions(effective, required, options?.any ? "any" : "all");
  if (!ok) {
    throw new Error(options?.message || "Forbidden");
  }

  return session;
}
