"use client";

import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { SystemSettings } from "@/types/settings";
import { updateSettings } from "@/actions/settings";
import { Loader2, Save, Ticket } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
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
  DialogDescription as DialogDescriptionBase,
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
  createTicketCategory,
  deleteTicketCategory,
  getTicketCategories,
  updateTicketCategory,
} from "@/actions/ticket-categories";
import {
  createTicketDepartment,
  deleteTicketDepartment,
  getTicketDepartments,
  updateTicketDepartment,
} from "@/actions/ticket-departments";
import {
  createTicketProduct,
  deleteTicketProduct,
  getTicketProducts,
  updateTicketProduct,
} from "@/actions/ticket-products";
import { Pencil, Plus, Trash2 } from "lucide-react";

const ticketSettingsSchema = z.object({
  ticketNumberPrefix: z.string().min(1, "Prefix is required"),
  defaultPriority: z.enum(["low", "medium", "high", "urgent"]),
  autoCloseResolvedTicketsDays: z.number().min(0).max(365),
  allowCustomerCloseTickets: z.boolean(),
  requirePurchaseCode: z.boolean(),
  enableInternalNotes: z.boolean(),
  enableTicketTags: z.boolean(),
});

type TicketSettingsFormData = z.infer<typeof ticketSettingsSchema>;

interface TicketSettingsFormProps {
  settings: SystemSettings;
}

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
};

type DepartmentRow = CategoryRow;
type ProductRow = CategoryRow;

const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  slug: z.string().optional(),
});

type CreateCategoryFormData = z.infer<typeof createCategorySchema>;

const editCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  slug: z.string().min(1, "Slug is required").optional(),
  sortOrder: z.number().min(0).max(1000),
  isActive: z.boolean(),
});

type EditCategoryFormData = z.infer<typeof editCategorySchema>;

const createDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  slug: z.string().optional(),
});

type CreateDepartmentFormData = z.infer<typeof createDepartmentSchema>;

const editDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  slug: z.string().min(1, "Slug is required").optional(),
  sortOrder: z.number().min(0).max(1000),
  isActive: z.boolean(),
});

type EditDepartmentFormData = z.infer<typeof editDepartmentSchema>;

const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  slug: z.string().optional(),
});

type CreateProductFormData = z.infer<typeof createProductSchema>;

const editProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  slug: z.string().min(1, "Slug is required").optional(),
  sortOrder: z.number().min(0).max(1000),
  isActive: z.boolean(),
});

type EditProductFormData = z.infer<typeof editProductSchema>;

export function TicketSettingsForm({ settings }: TicketSettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [togglingCategoryId, setTogglingCategoryId] = useState<string | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<CategoryRow | null>(
    null,
  );
  const [deletingCategory, setDeletingCategory] = useState(false);

  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departmentsError, setDepartmentsError] = useState("");
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [creatingDepartment, setCreatingDepartment] = useState(false);
  const [addDepartmentOpen, setAddDepartmentOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentRow | null>(null);
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [togglingDepartmentId, setTogglingDepartmentId] = useState<string | null>(null);
  const [deleteDepartmentTarget, setDeleteDepartmentTarget] =
    useState<DepartmentRow | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState(false);

  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);
  const [deleteProductTarget, setDeleteProductTarget] =
    useState<ProductRow | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TicketSettingsFormData>({
    resolver: zodResolver(ticketSettingsSchema),
    defaultValues: settings.tickets,
  });

  const createCategoryForm = useForm<CreateCategoryFormData>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: { name: "", slug: "" },
  });

  const editCategoryForm = useForm<EditCategoryFormData>({
    resolver: zodResolver(editCategorySchema),
    defaultValues: { name: "", slug: "", sortOrder: 100, isActive: true },
  });

  const createDepartmentForm = useForm<CreateDepartmentFormData>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: { name: "", slug: "" },
  });

  const editDepartmentForm = useForm<EditDepartmentFormData>({
    resolver: zodResolver(editDepartmentSchema),
    defaultValues: { name: "", slug: "", sortOrder: 100, isActive: true },
  });

  const createProductForm = useForm<CreateProductFormData>({
    resolver: zodResolver(createProductSchema),
    defaultValues: { name: "", slug: "" },
  });

  const editProductForm = useForm<EditProductFormData>({
    resolver: zodResolver(editProductSchema),
    defaultValues: { name: "", slug: "", sortOrder: 100, isActive: true },
  });

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const byOrder = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (byOrder !== 0) return byOrder;
      return a.name.localeCompare(b.name);
    });
  }, [categories]);

  const refreshCategories = async () => {
    setCategoriesLoading(true);
    setCategoriesError("");
    try {
      const result = await getTicketCategories();
      if (!result.success || !result.data) {
        setCategoriesError(result.error || "Failed to load categories");
        setCategories([]);
      } else {
        setCategories(result.data);
      }
    } catch (e) {
      setCategoriesError(e instanceof Error ? e.message : "Failed to load categories");
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    void refreshCategories();
  }, []);

  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => {
      const byOrder = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (byOrder !== 0) return byOrder;
      return a.name.localeCompare(b.name);
    });
  }, [departments]);

  const refreshDepartments = async () => {
    setDepartmentsLoading(true);
    setDepartmentsError("");
    try {
      const result = await getTicketDepartments();
      if (!result.success || !result.data) {
        setDepartmentsError(result.error || "Failed to load departments");
        setDepartments([]);
      } else {
        setDepartments(result.data);
      }
    } catch (e) {
      setDepartmentsError(
        e instanceof Error ? e.message : "Failed to load departments",
      );
      setDepartments([]);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  useEffect(() => {
    void refreshDepartments();
  }, []);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const byOrder = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (byOrder !== 0) return byOrder;
      return a.name.localeCompare(b.name);
    });
  }, [products]);

  const refreshProducts = async () => {
    setProductsLoading(true);
    setProductsError("");
    try {
      const result = await getTicketProducts();
      if (!result.success || !result.data) {
        setProductsError(result.error || "Failed to load products");
        setProducts([]);
      } else {
        setProducts(result.data);
      }
    } catch (e) {
      setProductsError(
        e instanceof Error ? e.message : "Failed to load products",
      );
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    void refreshProducts();
  }, []);

  const onSubmit = async (data: TicketSettingsFormData) => {
    setIsLoading(true);

    try {
      const result = await updateSettings({
        tickets: data,
      });

      if (result.success) {
        toast.success("Ticket settings updated successfully");
      } else {
        toast.error(result.error || "Failed to update settings");
      }
    } catch (error) {
      toast.error("An error occurred while updating settings");
    } finally {
      setIsLoading(false);
    }
  };

  const onCreateCategory = async (data: CreateCategoryFormData) => {
    setCreatingCategory(true);
    try {
      const result = await createTicketCategory({
        name: data.name,
        slug: data.slug,
      });
      if (result.success) {
        toast.success("Category added");
        createCategoryForm.reset({ name: "", slug: "" });
        setAddCategoryOpen(false);
        await refreshCategories();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to add category");
      }
    } catch {
      toast.error("Failed to add category");
    } finally {
      setCreatingCategory(false);
    }
  };

  const openEditCategory = (category: CategoryRow) => {
    setEditingCategory(category);
    editCategoryForm.reset({
      name: category.name,
      slug: category.slug,
      sortOrder: category.sortOrder ?? 0,
      isActive: category.isActive,
    });
  };

  const onSaveCategory = async (data: EditCategoryFormData) => {
    if (!editingCategory) return;
    setSavingCategory(true);
    try {
      const payload: {
        id: string;
        name: string;
        sortOrder: number;
        isActive: boolean;
        slug?: string;
      } = {
        id: editingCategory.id,
        name: data.name,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      };
      if (!editingCategory.isSystem) payload.slug = data.slug;
      const result = await updateTicketCategory(payload);
      if (result.success) {
        toast.success("Category updated");
        setEditingCategory(null);
        await refreshCategories();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update category");
      }
    } catch {
      toast.error("Failed to update category");
    } finally {
      setSavingCategory(false);
    }
  };

  const onConfirmDeleteCategory = async () => {
    if (!deleteCategoryTarget) return;
    setDeletingCategory(true);
    try {
      const result = await deleteTicketCategory(deleteCategoryTarget.id);
      if (result.success) {
        toast.success("Category deleted");
        setDeleteCategoryTarget(null);
        await refreshCategories();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete category");
      }
    } catch {
      toast.error("Failed to delete category");
    } finally {
      setDeletingCategory(false);
    }
  };

  const onToggleCategoryActive = async (category: CategoryRow, next: boolean) => {
    setTogglingCategoryId(category.id);
    try {
      const result = await updateTicketCategory({ id: category.id, isActive: next });
      if (result.success) {
        toast.success(next ? "Category enabled" : "Category disabled");
        await refreshCategories();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update category");
      }
    } catch {
      toast.error("Failed to update category");
    } finally {
      setTogglingCategoryId(null);
    }
  };

  const onCreateDepartment = async (data: CreateDepartmentFormData) => {
    setCreatingDepartment(true);
    try {
      const result = await createTicketDepartment({
        name: data.name,
        slug: data.slug,
      });
      if (result.success) {
        toast.success("Department added");
        createDepartmentForm.reset({ name: "", slug: "" });
        setAddDepartmentOpen(false);
        await refreshDepartments();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to add department");
      }
    } catch {
      toast.error("Failed to add department");
    } finally {
      setCreatingDepartment(false);
    }
  };

  const openEditDepartment = (department: DepartmentRow) => {
    setEditingDepartment(department);
    editDepartmentForm.reset({
      name: department.name,
      slug: department.slug,
      sortOrder: department.sortOrder ?? 0,
      isActive: department.isActive,
    });
  };

  const onSaveDepartment = async (data: EditDepartmentFormData) => {
    if (!editingDepartment) return;
    setSavingDepartment(true);
    try {
      const payload: {
        id: string;
        name: string;
        sortOrder: number;
        isActive: boolean;
        slug?: string;
      } = {
        id: editingDepartment.id,
        name: data.name,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      };
      if (!editingDepartment.isSystem) payload.slug = data.slug;
      const result = await updateTicketDepartment(payload);
      if (result.success) {
        toast.success("Department updated");
        setEditingDepartment(null);
        await refreshDepartments();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update department");
      }
    } catch {
      toast.error("Failed to update department");
    } finally {
      setSavingDepartment(false);
    }
  };

  const onConfirmDeleteDepartment = async () => {
    if (!deleteDepartmentTarget) return;
    setDeletingDepartment(true);
    try {
      const result = await deleteTicketDepartment(deleteDepartmentTarget.id);
      if (result.success) {
        toast.success("Department deleted");
        setDeleteDepartmentTarget(null);
        await refreshDepartments();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete department");
      }
    } catch {
      toast.error("Failed to delete department");
    } finally {
      setDeletingDepartment(false);
    }
  };

  const onToggleDepartmentActive = async (
    department: DepartmentRow,
    next: boolean,
  ) => {
    setTogglingDepartmentId(department.id);
    try {
      const result = await updateTicketDepartment({
        id: department.id,
        isActive: next,
      });
      if (result.success) {
        toast.success(next ? "Department enabled" : "Department disabled");
        await refreshDepartments();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update department");
      }
    } catch {
      toast.error("Failed to update department");
    } finally {
      setTogglingDepartmentId(null);
    }
  };

  const onCreateProduct = async (data: CreateProductFormData) => {
    setCreatingProduct(true);
    try {
      const result = await createTicketProduct({
        name: data.name,
        slug: data.slug,
      });
      if (result.success) {
        toast.success("Product added");
        createProductForm.reset({ name: "", slug: "" });
        setAddProductOpen(false);
        await refreshProducts();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to add product");
      }
    } catch {
      toast.error("Failed to add product");
    } finally {
      setCreatingProduct(false);
    }
  };

  const openEditProduct = (product: ProductRow) => {
    setEditingProduct(product);
    editProductForm.reset({
      name: product.name,
      slug: product.slug,
      sortOrder: product.sortOrder ?? 0,
      isActive: product.isActive,
    });
  };

  const onSaveProduct = async (data: EditProductFormData) => {
    if (!editingProduct) return;
    setSavingProduct(true);
    try {
      const payload: {
        id: string;
        name: string;
        sortOrder: number;
        isActive: boolean;
        slug?: string;
      } = {
        id: editingProduct.id,
        name: data.name,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      };
      if (!editingProduct.isSystem) payload.slug = data.slug;
      const result = await updateTicketProduct(payload);
      if (result.success) {
        toast.success("Product updated");
        setEditingProduct(null);
        await refreshProducts();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update product");
      }
    } catch {
      toast.error("Failed to update product");
    } finally {
      setSavingProduct(false);
    }
  };

  const onConfirmDeleteProduct = async () => {
    if (!deleteProductTarget) return;
    setDeletingProduct(true);
    try {
      const result = await deleteTicketProduct(deleteProductTarget.id);
      if (result.success) {
        toast.success("Product deleted");
        setDeleteProductTarget(null);
        await refreshProducts();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete product");
      }
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeletingProduct(false);
    }
  };

  const onToggleProductActive = async (
    product: ProductRow,
    next: boolean,
  ) => {
    setTogglingProductId(product.id);
    try {
      const result = await updateTicketProduct({
        id: product.id,
        isActive: next,
      });
      if (result.success) {
        toast.success(next ? "Product enabled" : "Product disabled");
        await refreshProducts();
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update product");
      }
    } catch {
      toast.error("Failed to update product");
    } finally {
      setTogglingProductId(null);
    }
  };

  return (
    <Card className="overflow-hidden rounded-lg border-0 p-0 shadow-lg bg-gradient-to-br from-card to-card/80">
      <CardHeader className="border-b p-6 gap-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-500/10">
            <Ticket className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <CardTitle className="text-xl">Ticket Settings</CardTitle>
            <CardDescription className="mt-1">
              Configure how tickets are created and managed
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Ticket Configuration Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Ticket Configuration
            </h3>
            <div className="rounded-xl border bg-muted/20 p-5">
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Ticket Number Prefix */}
                <div className="space-y-2">
                  <Label
                    htmlFor="ticketNumberPrefix"
                    className="text-sm font-medium"
                  >
                    Ticket Number Prefix
                  </Label>
                  <Input
                    id="ticketNumberPrefix"
                    {...register("ticketNumberPrefix")}
                    placeholder="TICKET"
                    className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">
                    Example: TICKET-0001, TICKET-0002, etc.
                  </p>
                  {errors.ticketNumberPrefix && (
                    <p className="text-sm text-destructive">
                      {errors.ticketNumberPrefix.message}
                    </p>
                  )}
                </div>

                {/* Default Priority */}
                <div className="space-y-2">
                  <Label
                    htmlFor="defaultPriority"
                    className="text-sm font-medium"
                  >
                    Default Priority
                  </Label>
                  <Select
                    value={watch("defaultPriority")}
                    onValueChange={(value: string) =>
                      setValue(
                        "defaultPriority",
                        value as "low" | "medium" | "high" | "urgent"
                      )
                    }
                  >
                    <SelectTrigger className="h-11 bg-background/80 border-input/50">
                      <SelectValue placeholder="Select default priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.defaultPriority && (
                    <p className="text-sm text-destructive">
                      {errors.defaultPriority.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Auto Close Resolved Tickets */}
              <div className="mt-5 space-y-2">
                <Label
                  htmlFor="autoCloseResolvedTicketsDays"
                  className="text-sm font-medium"
                >
                  Auto-close Resolved Tickets (Days)
                </Label>
                <Input
                  id="autoCloseResolvedTicketsDays"
                  type="number"
                  {...register("autoCloseResolvedTicketsDays", {
                    valueAsNumber: true,
                  })}
                  placeholder="7"
                  className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Automatically close tickets after they&apos;ve been resolved
                  for this many days. Set to 0 to disable.
                </p>
                {errors.autoCloseResolvedTicketsDays && (
                  <p className="text-sm text-destructive">
                    {errors.autoCloseResolvedTicketsDays.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Feature Toggles Section */}
          <div className="space-y-4 mb-0">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Feature Toggles
            </h3>
            <div className="space-y-3">
              {/* Allow Customer Close Tickets */}
              <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4 hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="allowCustomerCloseTickets"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Allow Customers to Close Tickets
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Let customers close their own tickets
                  </p>
                </div>
                <Switch
                  id="allowCustomerCloseTickets"
                  checked={watch("allowCustomerCloseTickets")}
                  onCheckedChange={(checked) =>
                    setValue("allowCustomerCloseTickets", checked)
                  }
                />
              </div>

              {/* Require Purchase Code */}
              <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4 hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="requirePurchaseCode"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Require Purchase Code
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Require customers to provide a valid purchase code when
                    creating tickets
                  </p>
                </div>
                <Switch
                  id="requirePurchaseCode"
                  checked={watch("requirePurchaseCode")}
                  onCheckedChange={(checked) =>
                    setValue("requirePurchaseCode", checked)
                  }
                />
              </div>

              {/* Enable Internal Notes */}
              <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4 hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="enableInternalNotes"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Enable Internal Notes
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Allow support staff to add private notes that customers
                    can&apos;t see
                  </p>
                </div>
                <Switch
                  id="enableInternalNotes"
                  checked={watch("enableInternalNotes")}
                  onCheckedChange={(checked) =>
                    setValue("enableInternalNotes", checked)
                  }
                />
              </div>

              {/* Enable Ticket Tags */}
              <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4 hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="enableTicketTags"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Enable Ticket Tags
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Allow adding custom tags to tickets for better organization
                  </p>
                </div>
                <Switch
                  id="enableTicketTags"
                  checked={watch("enableTicketTags")}
                  onCheckedChange={(checked) =>
                    setValue("enableTicketTags", checked)
                  }
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end py-6">
            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 px-6 shadow-md hover:shadow-lg transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Ticket Categories
          </h3>

          <div className="rounded-xl border bg-muted/20 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Categories</div>
                <div className="text-xs text-muted-foreground">
                  Add custom categories for ticket creation
                </div>
              </div>
              <Button type="button" onClick={() => setAddCategoryOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-border bg-card/50 backdrop-blur-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/50 bg-muted/20 hover:bg-muted/20">
                  <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    Name
                  </TableHead>
                  <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    Slug
                  </TableHead>
                  <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    Order
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
                {categoriesLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Loading categories...
                    </TableCell>
                  </TableRow>
                ) : categoriesError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-destructive">
                      {categoriesError}
                    </TableCell>
                  </TableRow>
                ) : sortedCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No categories found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedCategories.map((cat) => (
                    <TableRow
                      key={cat.id}
                      className="border-b border-border/30 hover:bg-muted/30 transition-all duration-200"
                    >
                      <TableCell className="py-3.5 px-4">
                        <div className="font-medium">{cat.name}</div>
                        {cat.isSystem && (
                          <div className="text-xs text-muted-foreground">System</div>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-muted-foreground">
                        {cat.slug}
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-muted-foreground">
                        {cat.sortOrder ?? 0}
                      </TableCell>
                      <TableCell className="py-3.5 px-4">
                        <Switch
                          checked={cat.isActive}
                          disabled={togglingCategoryId === cat.id}
                          onCheckedChange={(next) => onToggleCategoryActive(cat, next)}
                        />
                      </TableCell>
                      <TableCell className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditCategory(cat)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={cat.isSystem}
                            onClick={() => setDeleteCategoryTarget(cat)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-4 mt-8">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Ticket Departments
          </h3>

          <div className="rounded-xl border bg-muted/20 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Departments</div>
                <div className="text-xs text-muted-foreground">
                  Add departments to route tickets to the right team
                </div>
              </div>
              <Button type="button" onClick={() => setAddDepartmentOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-border bg-card/50 backdrop-blur-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/50 bg-muted/20 hover:bg-muted/20">
                  <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    Name
                  </TableHead>
                  <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    Slug
                  </TableHead>
                  <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    Order
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
                {departmentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Loading departments...
                    </TableCell>
                  </TableRow>
                ) : departmentsError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-destructive">
                      {departmentsError}
                    </TableCell>
                  </TableRow>
                ) : sortedDepartments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No departments found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedDepartments.map((dept) => (
                    <TableRow
                      key={dept.id}
                      className="border-b border-border/30 hover:bg-muted/30 transition-all duration-200"
                    >
                      <TableCell className="py-3.5 px-4">
                        <div className="font-medium">{dept.name}</div>
                        {dept.isSystem && (
                          <div className="text-xs text-muted-foreground">System</div>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-muted-foreground">
                        {dept.slug}
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-muted-foreground">
                        {dept.sortOrder ?? 0}
                      </TableCell>
                      <TableCell className="py-3.5 px-4">
                        <Switch
                          checked={dept.isActive}
                          disabled={togglingDepartmentId === dept.id}
                          onCheckedChange={(next) => onToggleDepartmentActive(dept, next)}
                        />
                      </TableCell>
                      <TableCell className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDepartment(dept)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={dept.isSystem}
                            onClick={() => setDeleteDepartmentTarget(dept)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-4 mt-8">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Ticket Products
          </h3>

          <div className="rounded-xl border bg-muted/20 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Products</div>
                <div className="text-xs text-muted-foreground">
                  Add products that customers can pick when creating a ticket
                </div>
              </div>
              <Button type="button" onClick={() => setAddProductOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-border bg-card/50 backdrop-blur-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/50 bg-muted/20 hover:bg-muted/20">
                  <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    Name
                  </TableHead>
                  <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    Slug
                  </TableHead>
                  <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                    Order
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
                {productsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Loading products...
                    </TableCell>
                  </TableRow>
                ) : productsError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-destructive">
                      {productsError}
                    </TableCell>
                  </TableRow>
                ) : sortedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedProducts.map((prod) => (
                    <TableRow
                      key={prod.id}
                      className="border-b border-border/30 hover:bg-muted/30 transition-all duration-200"
                    >
                      <TableCell className="py-3.5 px-4">
                        <div className="font-medium">{prod.name}</div>
                        {prod.isSystem && (
                          <div className="text-xs text-muted-foreground">System</div>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-muted-foreground">
                        {prod.slug}
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-muted-foreground">
                        {prod.sortOrder ?? 0}
                      </TableCell>
                      <TableCell className="py-3.5 px-4">
                        <Switch
                          checked={prod.isActive}
                          disabled={togglingProductId === prod.id}
                          onCheckedChange={(next) => onToggleProductActive(prod, next)}
                        />
                      </TableCell>
                      <TableCell className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditProduct(prod)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={prod.isSystem}
                            onClick={() => setDeleteProductTarget(prod)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <Dialog
          open={addCategoryOpen}
          onOpenChange={(open) => {
            if (!open && !creatingCategory) {
              setAddCategoryOpen(false);
              createCategoryForm.reset({ name: "", slug: "" });
            } else {
              setAddCategoryOpen(open);
            }
          }}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add Category</DialogTitle>
              <DialogDescriptionBase>
                Create a new ticket category. It will appear in ticket creation lists.
              </DialogDescriptionBase>
            </DialogHeader>

            <form
              onSubmit={createCategoryForm.handleSubmit(onCreateCategory)}
              className="space-y-5"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Name</Label>
                  <Input
                    className="h-11"
                    {...createCategoryForm.register("name")}
                    disabled={creatingCategory}
                  />
                  {createCategoryForm.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {createCategoryForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Slug (optional)</Label>
                  <Input
                    className="h-11"
                    {...createCategoryForm.register("slug")}
                    disabled={creatingCategory}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddCategoryOpen(false)}
                  disabled={creatingCategory}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creatingCategory}>
                  {creatingCategory ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescriptionBase>Update category name, slug, order, and active state.</DialogDescriptionBase>
            </DialogHeader>
            <form onSubmit={editCategoryForm.handleSubmit(onSaveCategory)} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Name</Label>
                  <Input {...editCategoryForm.register("name")} className="h-11" />
                  {editCategoryForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{editCategoryForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Slug</Label>
                  <Input
                    {...editCategoryForm.register("slug")}
                    className="h-11"
                    disabled={!!editingCategory?.isSystem}
                  />
                  {editCategoryForm.formState.errors.slug && (
                    <p className="text-sm text-destructive">{editCategoryForm.formState.errors.slug.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sort Order</Label>
                  <Input
                    type="number"
                    className="h-11"
                    {...editCategoryForm.register("sortOrder", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Active</Label>
                  <div className="h-11 flex items-center">
                    <Switch
                      checked={editCategoryForm.watch("isActive")}
                      onCheckedChange={(checked) => editCategoryForm.setValue("isActive", checked)}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingCategory(null)}
                  disabled={savingCategory}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingCategory}>
                  {savingCategory ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!deleteCategoryTarget}
          onOpenChange={(open) => {
            if (!open && !deletingCategory) setDeleteCategoryTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete category?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete{" "}
                <span className="font-medium text-foreground">
                  {deleteCategoryTarget?.name}
                </span>
                . This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingCategory}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deletingCategory || !deleteCategoryTarget}
                onClick={(e) => {
                  e.preventDefault();
                  void onConfirmDeleteCategory();
                }}
              >
                {deletingCategory ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={addDepartmentOpen}
          onOpenChange={(open) => {
            if (!open && !creatingDepartment) {
              setAddDepartmentOpen(false);
              createDepartmentForm.reset({ name: "", slug: "" });
            } else {
              setAddDepartmentOpen(open);
            }
          }}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add Department</DialogTitle>
              <DialogDescriptionBase>
                Create a new ticket department. It will appear in ticket creation lists.
              </DialogDescriptionBase>
            </DialogHeader>

            <form
              onSubmit={createDepartmentForm.handleSubmit(onCreateDepartment)}
              className="space-y-5"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Name</Label>
                  <Input
                    className="h-11"
                    {...createDepartmentForm.register("name")}
                    disabled={creatingDepartment}
                  />
                  {createDepartmentForm.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {createDepartmentForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Slug (optional)</Label>
                  <Input
                    className="h-11"
                    {...createDepartmentForm.register("slug")}
                    disabled={creatingDepartment}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddDepartmentOpen(false)}
                  disabled={creatingDepartment}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creatingDepartment}>
                  {creatingDepartment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingDepartment} onOpenChange={(open) => !open && setEditingDepartment(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Department</DialogTitle>
              <DialogDescriptionBase>Update department name, slug, order, and active state.</DialogDescriptionBase>
            </DialogHeader>
            <form onSubmit={editDepartmentForm.handleSubmit(onSaveDepartment)} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Name</Label>
                  <Input {...editDepartmentForm.register("name")} className="h-11" />
                  {editDepartmentForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{editDepartmentForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Slug</Label>
                  <Input
                    {...editDepartmentForm.register("slug")}
                    className="h-11"
                    disabled={!!editingDepartment?.isSystem}
                  />
                  {editDepartmentForm.formState.errors.slug && (
                    <p className="text-sm text-destructive">{editDepartmentForm.formState.errors.slug.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sort Order</Label>
                  <Input
                    type="number"
                    className="h-11"
                    {...editDepartmentForm.register("sortOrder", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Active</Label>
                  <div className="h-11 flex items-center">
                    <Switch
                      checked={editDepartmentForm.watch("isActive")}
                      onCheckedChange={(checked) => editDepartmentForm.setValue("isActive", checked)}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingDepartment(null)}
                  disabled={savingDepartment}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingDepartment}>
                  {savingDepartment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!deleteDepartmentTarget}
          onOpenChange={(open) => {
            if (!open && !deletingDepartment) setDeleteDepartmentTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete department?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete{" "}
                <span className="font-medium text-foreground">
                  {deleteDepartmentTarget?.name}
                </span>
                . This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingDepartment}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deletingDepartment || !deleteDepartmentTarget}
                onClick={(e) => {
                  e.preventDefault();
                  void onConfirmDeleteDepartment();
                }}
              >
                {deletingDepartment ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={addProductOpen}
          onOpenChange={(open) => {
            if (!open && !creatingProduct) {
              setAddProductOpen(false);
              createProductForm.reset({ name: "", slug: "" });
            } else {
              setAddProductOpen(open);
            }
          }}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add Product</DialogTitle>
              <DialogDescriptionBase>
                Create a new ticket product. It will appear in ticket creation lists.
              </DialogDescriptionBase>
            </DialogHeader>

            <form
              onSubmit={createProductForm.handleSubmit(onCreateProduct)}
              className="space-y-5"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Name</Label>
                  <Input
                    className="h-11"
                    {...createProductForm.register("name")}
                    disabled={creatingProduct}
                  />
                  {createProductForm.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {createProductForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Slug (optional)</Label>
                  <Input
                    className="h-11"
                    {...createProductForm.register("slug")}
                    disabled={creatingProduct}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddProductOpen(false)}
                  disabled={creatingProduct}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creatingProduct}>
                  {creatingProduct ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescriptionBase>Update product name, slug, order, and active state.</DialogDescriptionBase>
            </DialogHeader>
            <form onSubmit={editProductForm.handleSubmit(onSaveProduct)} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Name</Label>
                  <Input {...editProductForm.register("name")} className="h-11" />
                  {editProductForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{editProductForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Slug</Label>
                  <Input
                    {...editProductForm.register("slug")}
                    className="h-11"
                    disabled={!!editingProduct?.isSystem}
                  />
                  {editProductForm.formState.errors.slug && (
                    <p className="text-sm text-destructive">{editProductForm.formState.errors.slug.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sort Order</Label>
                  <Input
                    type="number"
                    className="h-11"
                    {...editProductForm.register("sortOrder", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Active</Label>
                  <div className="h-11 flex items-center">
                    <Switch
                      checked={editProductForm.watch("isActive")}
                      onCheckedChange={(checked) => editProductForm.setValue("isActive", checked)}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingProduct(null)}
                  disabled={savingProduct}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingProduct}>
                  {savingProduct ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!deleteProductTarget}
          onOpenChange={(open) => {
            if (!open && !deletingProduct) setDeleteProductTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete product?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete{" "}
                <span className="font-medium text-foreground">
                  {deleteProductTarget?.name}
                </span>
                . This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingProduct}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deletingProduct || !deleteProductTarget}
                onClick={(e) => {
                  e.preventDefault();
                  void onConfirmDeleteProduct();
                }}
              >
                {deletingProduct ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
