"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Shield } from "lucide-react";

import { PERMISSIONS, RBAC_ROLE_SCOPES, type Permission } from "@/types/rbac";
import {
  createRbacRoleAction,
  deleteRbacRoleAction,
  getRbacRoles,
  updateRbacRoleAction,
} from "@/actions/rbac-roles";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const roleSchema = z.object({
  name: z.string().min(2).max(60),
  key: z.string().min(2).max(64),
  description: z.string().max(200).optional(),
  scopeBaseRole: z.enum(RBAC_ROLE_SCOPES),
  permissions: z.array(z.enum(PERMISSIONS)),
});

type RoleFormData = z.infer<typeof roleSchema>;

function groupPermissions(perms: readonly Permission[]) {
  const grouped: Record<string, Permission[]> = {};
  for (const p of perms) {
    const group = p.split(".")[0] || "other";
    grouped[group] ||= [];
    grouped[group].push(p);
  }
  return grouped;
}

export function AccessSettingsForm() {
  type RoleRow = Omit<import("@/types/rbac").RbacRole, "_id"> & { _id: string };
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selectedRole, setSelectedRole] = useState<RoleRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const groupedPermissions = useMemo(() => groupPermissions(PERMISSIONS), []);

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      key: "",
      description: "",
      scopeBaseRole: "support",
      permissions: [],
    },
  });

  const watchedPerms = form.watch("permissions");

  const load = async () => {
    setLoading(true);
    const result = await getRbacRoles();
    if (!result.success || !result.data) {
      toast.error(result.error || "Failed to load roles");
      setRoles([]);
      setLoading(false);
      return;
    }
    setRoles(result.data as unknown as RoleRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setMode("create");
    setSelectedRole(null);
    form.reset({
      name: "",
      key: "",
      description: "",
      scopeBaseRole: "support",
      permissions: [],
    });
    setDialogOpen(true);
  };

  const openEdit = (role: RoleRow) => {
    setMode("edit");
    setSelectedRole(role);
    form.reset({
      name: role.name,
      key: role.key,
      description: role.description || "",
      scopeBaseRole: role.scopeBaseRole,
      permissions: (role.permissions || []) as Permission[],
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: RoleFormData) => {
    setSaving(true);
    try {
      if (mode === "create") {
        const result = await createRbacRoleAction({
          name: data.name,
          key: data.key,
          description: data.description,
          scopeBaseRole: data.scopeBaseRole,
          permissions: data.permissions,
        });
        if (!result.success) {
          toast.error(result.error || "Failed to create role");
          return;
        }
        toast.success("Role created");
      } else if (selectedRole) {
        const result = await updateRbacRoleAction({
          roleId: selectedRole._id,
          name: data.name,
          description: data.description,
          permissions: data.permissions,
        });
        if (!result.success) {
          toast.error(result.error || "Failed to update role");
          return;
        }
        toast.success("Role updated");
      }
      setDialogOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (perm: Permission) => {
    const current = new Set<Permission>(watchedPerms || []);
    if (current.has(perm)) current.delete(perm);
    else current.add(perm);
    form.setValue("permissions", Array.from(current), { shouldValidate: true });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteRbacRoleAction(deleteTarget._id);
      if (!result.success) {
        toast.error(result.error || "Failed to delete role");
        return;
      }
      toast.success("Role deleted");
      setDeleteTarget(null);
      await load();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-lg border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Access Control (RBAC)</CardTitle>
          </div>
          <Button onClick={openCreate} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            New Role
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading roles...
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden border border-border bg-card/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50 bg-muted/20 hover:bg-muted/20">
                    <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      Role
                    </TableHead>
                    <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      Base
                    </TableHead>
                    <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      Permissions
                    </TableHead>
                    <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      Type
                    </TableHead>
                    <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider w-[120px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-background/50">
                  {roles.map((role) => (
                    <TableRow
                      key={String(role._id)}
                      className="border-b border-border/30 hover:bg-muted/30 transition-all duration-200"
                    >
                      <TableCell className="py-3 px-4">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {role.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {role.key}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <Badge variant="secondary" className="capitalize">
                          {role.scopeBaseRole}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-sm text-muted-foreground">
                        {(role.permissions || []).length}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {role.isSystem ? (
                          <Badge variant="outline">System</Badge>
                        ) : (
                          <Badge variant="secondary">Custom</Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(role)}
                            disabled={role.isSystem}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(role)}
                            disabled={role.isSystem}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Create Role" : "Edit Role"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" disabled={saving} {...form.register("name")} />
                {form.formState.errors.name?.message && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="key">Key</Label>
                <Input
                  id="key"
                  disabled={saving || mode === "edit"}
                  {...form.register("key")}
                />
                {form.formState.errors.key?.message && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.key.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Base role</Label>
                <Select
                  value={form.watch("scopeBaseRole")}
                  onValueChange={(v) =>
                    form.setValue("scopeBaseRole", v as RoleFormData["scopeBaseRole"], {
                      shouldValidate: true,
                    })
                  }
                  disabled={saving || mode === "edit"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select base role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  className="min-h-[40px]"
                  disabled={saving}
                  {...form.register("description")}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Permissions</Label>
                <span className="text-xs text-muted-foreground">
                  Selected: {watchedPerms?.length || 0}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {Object.entries(groupedPermissions).map(([group, perms]) => (
                  <div key={group} className="rounded-lg border p-3">
                    <p className="text-sm font-medium capitalize mb-2">{group}</p>
                    <div className="space-y-2">
                      {perms.map((perm) => {
                        const checked = (watchedPerms || []).includes(perm);
                        return (
                          <label
                            key={perm}
                            className={cn(
                              "flex items-start gap-2 text-sm cursor-pointer",
                              saving && "opacity-60 cursor-not-allowed",
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => togglePermission(perm)}
                              disabled={saving}
                            />
                            <span className="leading-5">{perm}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Delete “${deleteTarget.name}”? This cannot be undone.`
                : "Delete this role?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
