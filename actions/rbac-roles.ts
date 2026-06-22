"use server";

import type { ApiResponse } from "@/types";
import type {
  Permission,
  RbacRole,
  RbacRoleCreateInput,
  RbacRoleScope,
} from "@/types/rbac";
import { requirePermissionOrThrow } from "@/lib/auth-utils";
import {
  createRbacRole,
  deleteRbacRole,
  ensureSystemRbacRoles,
  listRbacRoles,
  updateRbacRole,
} from "@/lib/rbac-store";
import { revalidatePath } from "next/cache";

export async function getRbacRoles(scope?: RbacRoleScope): Promise<ApiResponse<RbacRole[]>> {
  try {
    const session = await requirePermissionOrThrow("rbac.manage", {
      message: "Forbidden: RBAC manage access required",
    });
    await ensureSystemRbacRoles(session.user.id);
    const roles = await listRbacRoles(scope);
    return { success: true, data: JSON.parse(JSON.stringify(roles)) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch roles";
    return { success: false, error: message };
  }
}

export async function createRbacRoleAction(
  input: RbacRoleCreateInput,
): Promise<ApiResponse<RbacRole>> {
  try {
    const session = await requirePermissionOrThrow("rbac.manage", {
      message: "Forbidden: RBAC manage access required",
    });
    const role = await createRbacRole(input, session.user.id);
    revalidatePath("/admin/settings");
    return { success: true, data: JSON.parse(JSON.stringify(role)) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create role";
    return { success: false, error: message };
  }
}

export async function updateRbacRoleAction(options: {
  roleId: string;
  name?: string;
  description?: string;
  permissions?: Permission[];
}): Promise<ApiResponse<RbacRole | null>> {
  try {
    const session = await requirePermissionOrThrow("rbac.manage", {
      message: "Forbidden: RBAC manage access required",
    });
    const updated = await updateRbacRole(
      options.roleId,
      {
        ...(options.name !== undefined ? { name: options.name } : {}),
        ...(options.description !== undefined ? { description: options.description } : {}),
        ...(options.permissions !== undefined ? { permissions: options.permissions } : {}),
      },
      session.user.id,
    );
    revalidatePath("/admin/settings");
    return { success: true, data: updated ? JSON.parse(JSON.stringify(updated)) : null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update role";
    return { success: false, error: message };
  }
}

export async function deleteRbacRoleAction(roleId: string): Promise<ApiResponse<{ success: true }>> {
  try {
    const session = await requirePermissionOrThrow("rbac.manage", {
      message: "Forbidden: RBAC manage access required",
    });
    await deleteRbacRole(roleId, session.user.id);
    revalidatePath("/admin/settings");
    return { success: true, data: { success: true } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete role";
    return { success: false, error: message };
  }
}

export async function getAssignableRbacRoles(
  scope: RbacRoleScope,
): Promise<
  ApiResponse<
    Array<{
      id: string;
      name: string;
      key: string;
      isSystem: boolean;
      scopeBaseRole: RbacRoleScope;
    }>
  >
> {
  try {
    const session = await requirePermissionOrThrow("users.manage", {
      message: "Forbidden: Users manage access required",
    });
    await ensureSystemRbacRoles(session.user.id);
    const roles = await listRbacRoles(scope);
    return {
      success: true,
      data: roles.map((r) => ({
        id: r._id.toString(),
        name: r.name,
        key: r.key,
        isSystem: r.isSystem,
        scopeBaseRole: r.scopeBaseRole,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch roles";
    return { success: false, error: message };
  }
}
