"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Briefcase,
  Bolt,
  Download,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Wrench,
  Package,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { createService, deleteService, updateService } from "@/actions/services";
import type { UserRole } from "@/types";

type ServiceRow = {
  id: string;
  name: string;
  slug: string;
  href: string;
  iconKey: string;
  roles: UserRole[];
  isActive: boolean;
  sortOrder: number;
  description?: string;
};

const createServiceFormSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  slug: z.string().optional(),
  iconKey: z.string().min(1, "Icon is required"),
  description: z.string().optional(),
});

type CreateServiceFormData = z.infer<typeof createServiceFormSchema>;

const editServiceFormSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  slug: z.string().min(1, "Slug is required"),
  iconKey: z.string().min(1, "Icon is required"),
  description: z.string().optional(),
});

type EditServiceFormData = z.infer<typeof editServiceFormSchema>;

const ICON_OPTIONS: Array<{
  key: string;
  label: string;
  Icon: React.ElementType;
}> = [
  { key: "briefcase", label: "Briefcase", Icon: Briefcase },
  { key: "wrench", label: "Wrench", Icon: Wrench },
  { key: "download", label: "Download", Icon: Download },
  { key: "package", label: "Package", Icon: Package },
  { key: "bolt", label: "Bolt", Icon: Bolt },
];

function iconForKey(iconKey: string) {
  return ICON_OPTIONS.find((o) => o.key === iconKey)?.Icon ?? Briefcase;
}

export function ServicesSettingsForm({ services }: { services: ServiceRow[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRow | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteServiceTarget, setDeleteServiceTarget] = useState<ServiceRow | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const sortedServices = useMemo(() => {
    return [...services].sort((a, b) => {
      const byOrder = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (byOrder !== 0) return byOrder;
      return a.name.localeCompare(b.name);
    });
  }, [services]);

  const createForm = useForm<CreateServiceFormData>({
    resolver: zodResolver(createServiceFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      iconKey: "briefcase",
      description: "",
    },
  });

  const editForm = useForm<EditServiceFormData>({
    resolver: zodResolver(editServiceFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      iconKey: "briefcase",
      description: "",
    },
  });

  const openEdit = (service: ServiceRow) => {
    setEditingService(service);
    editForm.reset({
      name: service.name,
      slug: service.slug,
      iconKey: service.iconKey || "briefcase",
      description: service.description || "",
    });
  };

  const handleCreate = async (data: CreateServiceFormData) => {
    setCreating(true);
    try {
      const result = await createService({
        name: data.name,
        slug: data.slug,
        iconKey: data.iconKey,
        description: data.description,
      });

      if (result.success) {
        toast.success("Service added");
        createForm.reset({ name: "", slug: "", iconKey: "briefcase", description: "" });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to add service");
      }
    } catch {
      toast.error("Failed to add service");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (service: ServiceRow, next: boolean) => {
    const result = await updateService({ id: service.id, isActive: next });
    if (result.success) {
      router.refresh();
      toast.success(next ? "Service enabled" : "Service disabled");
    } else {
      toast.error(result.error || "Failed to update service");
    }
  };

  const handleDelete = async (service: ServiceRow) => {
    setDeleting(true);
    try {
      const result = await deleteService(service.id);
      if (result.success) {
        router.refresh();
        toast.success("Service deleted");
      } else {
        toast.error(result.error || "Failed to delete service");
      }
    } catch {
      toast.error("Failed to delete service");
    } finally {
      setDeleting(false);
      setDeleteServiceTarget(null);
    }
  };

  const handleSaveEdit = async (data: EditServiceFormData) => {
    if (!editingService) return;
    setSavingEdit(true);
    try {
      const result = await updateService({
        id: editingService.id,
        name: data.name,
        slug: data.slug,
        iconKey: data.iconKey,
        description: data.description,
      });

      if (result.success) {
        toast.success("Service updated");
        setEditingService(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update service");
      }
    } catch {
      toast.error("Failed to update service");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden rounded-lg p-0 border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
        <CardHeader className="border-b p-6 gap-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Services</CardTitle>
              <CardDescription className="mt-1">
                Create and manage service pages shown in the sidebar
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pb-6">
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Add Service
              </h3>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add
              </Button>
            </div>

            <div className="rounded-xl border bg-muted/20 p-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="serviceName" className="text-sm font-medium">
                    Service Name
                  </Label>
                  <Input
                    id="serviceName"
                    placeholder="Installation"
                    className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                    {...createForm.register("name")}
                  />
                  {createForm.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {createForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceSlug" className="text-sm font-medium">
                    Slug (optional)
                  </Label>
                  <Input
                    id="serviceSlug"
                    placeholder="installation"
                    className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                    {...createForm.register("slug")}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Icon</Label>
                  <Select
                    value={createForm.watch("iconKey")}
                    onValueChange={(value) => createForm.setValue("iconKey", value)}
                  >
                    <SelectTrigger className="h-11 bg-background/80 border-input/50">
                      <SelectValue placeholder="Select an icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map(({ key, label, Icon }) => (
                        <SelectItem key={key} value={key}>
                          <span className="inline-flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="serviceDescription" className="text-sm font-medium">
                    Description (optional)
                  </Label>
                  <Textarea
                    id="serviceDescription"
                    placeholder="Describe what this service is for..."
                    rows={3}
                    className="bg-background/80 border-input/50 focus:border-primary transition-colors resize-none"
                    {...createForm.register("description")}
                  />
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                New services will open at <span className="font-medium">/admin/services/&lt;slug&gt;</span>.
              </p>
            </div>
          </form>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Existing Services
            </h3>
            <div className="rounded-xl overflow-hidden border border-border bg-card/50 backdrop-blur-sm">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50 bg-muted/20 hover:bg-muted/20">
                    <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      Service
                    </TableHead>
                    <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      Slug
                    </TableHead>
                    <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      Path
                    </TableHead>
                    <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                      Active
                    </TableHead>
                    <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider w-[140px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-background/50">
                  {sortedServices.map((service) => {
                    const Icon = iconForKey(service.iconKey);
                    return (
                      <TableRow
                        key={service.id}
                        className="border-b border-border/30 hover:bg-muted/30 transition-all duration-200"
                      >
                        <TableCell className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="font-medium">{service.name}</div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-muted-foreground">
                          {service.slug}
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-muted-foreground">
                          {`/admin/services/${service.slug}`}
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <Switch
                            checked={service.isActive}
                            onCheckedChange={(next) => handleToggleActive(service, next)}
                          />
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(service)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteServiceTarget(service)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {sortedServices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        No services found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingService} onOpenChange={(open) => !open && setEditingService(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>Update service info and sidebar link.</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleSaveEdit)} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Name</Label>
                <Input {...editForm.register("name")} className="h-11" />
                {editForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{editForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Slug</Label>
                <Input {...editForm.register("slug")} className="h-11" />
                {editForm.formState.errors.slug && (
                  <p className="text-sm text-destructive">{editForm.formState.errors.slug.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Icon</Label>
                <Select
                  value={editForm.watch("iconKey")}
                  onValueChange={(value) => editForm.setValue("iconKey", value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select an icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(({ key, label, Icon }) => (
                      <SelectItem key={key} value={key}>
                        <span className="inline-flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Description</Label>
                <Textarea rows={4} {...editForm.register("description")} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingService(null)} disabled={savingEdit}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteServiceTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteServiceTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {deleteServiceTarget?.name}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting || !deleteServiceTarget}
              onClick={(e) => {
                e.preventDefault();
                if (!deleteServiceTarget) return;
                void handleDelete(deleteServiceTarget);
              }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
