import type { ObjectId } from "mongodb";

export const RBAC_ROLE_SCOPES = ["customer", "support", "admin"] as const;
export type RbacRoleScope = (typeof RBAC_ROLE_SCOPES)[number];

export const PERMISSIONS = [
  "panel.admin.access",
  "panel.support.access",
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
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type RbacRole = {
  _id: ObjectId;
  key: string;
  name: string;
  description?: string;
  scopeBaseRole: RbacRoleScope;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
};

export type RbacRoleCreateInput = Omit<
  RbacRole,
  "_id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "isSystem"
> & { permissions: Permission[] };

export type RbacRoleUpdateInput = Partial<
  Omit<RbacRoleCreateInput, "scopeBaseRole" | "key">
>;

