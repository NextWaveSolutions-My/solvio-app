import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import type { UserRole } from "@/types";
import type { Permission, RbacRole, RbacRoleScope } from "@/types/rbac";
import {
  defaultPermissionsForBaseRole,
  ensureSystemRbacRoles,
  getDefaultRbacRoleForScope,
  getRbacRoleById,
} from "@/lib/rbac-store";

function toScope(role: UserRole): RbacRoleScope {
  return role;
}

export async function getUserRbacRole(
  userId: string,
  baseRole: UserRole
): Promise<RbacRole | null> {
  const users = await getCollection<{ id: string; rbacRoleId?: string }>("user");
  const user = await users.findOne({ id: userId });
  const scope = toScope(baseRole);

  const assignedId = user?.rbacRoleId || null;
  if (assignedId) {
    const assigned = await getRbacRoleById(assignedId);
    if (assigned && assigned.scopeBaseRole === scope) return assigned;
  }

  const defaultRole = await getDefaultRbacRoleForScope(scope);
  return defaultRole ?? null;
}

export async function getEffectivePermissions(options: {
  userId: string;
  baseRole: UserRole;
}): Promise<Set<Permission>> {
  const { userId, baseRole } = options;
  const scope = toScope(baseRole);

  await ensureSystemRbacRoles(userId || "system");

  const users = await getCollection<{
    id: string;
    rbacRoleId?: string;
    rbacPermissionOverrides?: Permission[];
  }>("user");

  const user = await users.findOne({ id: userId });
  const role = await getUserRbacRole(userId, baseRole);

  const fromDefaults = defaultPermissionsForBaseRole(scope);
  const fromRole = (role?.permissions ?? []) as Permission[];
  const fromOverrides = (user?.rbacPermissionOverrides ?? []) as Permission[];

  return new Set<Permission>([...fromDefaults, ...fromRole, ...fromOverrides]);
}

export function hasPermissions(
  effective: Set<Permission>,
  required: Permission | Permission[],
  mode: "any" | "all" = "all"
) {
  const requiredList = Array.isArray(required) ? required : [required];
  if (requiredList.length === 0) return true;
  if (mode === "any") return requiredList.some((p) => effective.has(p));
  return requiredList.every((p) => effective.has(p));
}

