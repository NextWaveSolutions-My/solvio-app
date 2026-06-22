import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import type { Permission, RbacRole, RbacRoleCreateInput, RbacRoleScope } from "@/types/rbac";

const RBAC_ROLES_COLLECTION = "rbac_roles";

export function defaultPermissionsForBaseRole(scope: RbacRoleScope): Permission[] {
  if (scope === "admin") {
    return [
      "panel.admin.access",
      "settings.view",
      "settings.manage",
      "rbac.manage",
      "users.view",
      "users.manage",
      "tickets.view_all",
      "tickets.manage",
      "tickets.assign",
      "tickets.change_status",
      "tickets.change_priority",
      "comments.internal",
      "services.manage",
      "analytics.view",
      "messages.manage",
      "newsletter.manage",
      "landing.manage",
      "notifications.view_all",
      "meetings.manage",
      "clients.manage",
    ];
  }

  if (scope === "support") {
    return [
      "panel.support.access",
      "settings.view",
      "tickets.view_all",
      "tickets.manage",
      "tickets.assign",
      "tickets.change_status",
      "tickets.change_priority",
      "comments.internal",
      "messages.manage",
      "notifications.view_all",
      "meetings.manage",
      "clients.manage",
    ];
  }

  return [];
}

export async function getRbacRolesCollection() {
  return await getCollection<RbacRole>(RBAC_ROLES_COLLECTION);
}

export async function ensureSystemRbacRoles(userId: string) {
  const col = await getRbacRolesCollection();
  const existing = await col.find({ isSystem: true }).limit(1).toArray();
  if (existing.length > 0) return;

  const now = new Date();
  const systemRoles: Array<Omit<RbacRole, "_id">> = [
    {
      key: "admin-full-access",
      name: "Admin (Full Access)",
      description: "Built-in role with full access.",
      scopeBaseRole: "admin",
      permissions: defaultPermissionsForBaseRole("admin"),
      isSystem: true,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      key: "support-standard",
      name: "Support (Standard)",
      description: "Built-in role for support operations.",
      scopeBaseRole: "support",
      permissions: defaultPermissionsForBaseRole("support"),
      isSystem: true,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    },
    {
      key: "customer-default",
      name: "Customer (Default)",
      description: "Built-in customer role (ownership rules apply).",
      scopeBaseRole: "customer",
      permissions: defaultPermissionsForBaseRole("customer"),
      isSystem: true,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    },
  ];

  await col.insertMany(systemRoles as any[]);
}

export async function listRbacRoles(scope?: RbacRoleScope) {
  const col = await getRbacRolesCollection();
  const query = scope ? { scopeBaseRole: scope } : {};
  const roles = await col.find(query).sort({ isSystem: -1, name: 1 }).toArray();
  return roles;
}

export async function getRbacRoleById(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const col = await getRbacRolesCollection();
  return await col.findOne({ _id: new ObjectId(id) });
}

export async function getDefaultRbacRoleForScope(scope: RbacRoleScope) {
  const col = await getRbacRolesCollection();
  const systemKey =
    scope === "admin"
      ? "admin-full-access"
      : scope === "support"
        ? "support-standard"
        : "customer-default";
  return await col.findOne({ key: systemKey, isSystem: true });
}

function normalizeKey(key: string) {
  return key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_ ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
}

export async function createRbacRole(input: RbacRoleCreateInput, userId: string) {
  const col = await getRbacRolesCollection();
  const now = new Date();
  const key = normalizeKey(input.key || input.name);
  const doc: Omit<RbacRole, "_id"> = {
    key,
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    scopeBaseRole: input.scopeBaseRole,
    permissions: input.permissions,
    isSystem: false,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  };

  const existing = await col.findOne({ key });
  if (existing) {
    throw new Error("Role key already exists");
  }

  const result = await col.insertOne(doc as any);
  return { ...doc, _id: result.insertedId } as RbacRole;
}

export async function updateRbacRole(
  roleId: string,
  patch: Partial<Pick<RbacRole, "name" | "description" | "permissions">>,
  userId: string,
) {
  if (!ObjectId.isValid(roleId)) {
    throw new Error("Invalid role id");
  }
  const col = await getRbacRolesCollection();
  const existing = await col.findOne({ _id: new ObjectId(roleId) });
  if (!existing) throw new Error("Role not found");
  if (existing.isSystem) throw new Error("System roles cannot be edited");

  const updated = {
    ...(patch.name ? { name: patch.name.trim() } : {}),
    ...(patch.description !== undefined
      ? { description: patch.description?.trim() || undefined }
      : {}),
    ...(patch.permissions ? { permissions: patch.permissions } : {}),
    updatedAt: new Date(),
    updatedBy: userId,
  };

  await col.updateOne({ _id: new ObjectId(roleId) }, { $set: updated });
  return await col.findOne({ _id: new ObjectId(roleId) });
}

export async function deleteRbacRole(roleId: string, userId: string) {
  if (!ObjectId.isValid(roleId)) {
    throw new Error("Invalid role id");
  }
  const col = await getRbacRolesCollection();
  const existing = await col.findOne({ _id: new ObjectId(roleId) });
  if (!existing) throw new Error("Role not found");
  if (existing.isSystem) throw new Error("System roles cannot be deleted");

  const users = await getCollection<{ id: string; rbacRoleId?: string }>("user");
  const inUse = await users.countDocuments({ rbacRoleId: roleId });
  if (inUse > 0) throw new Error("Role is assigned to users");

  await col.deleteOne({ _id: new ObjectId(roleId) });
  return { success: true, deletedBy: userId };
}

