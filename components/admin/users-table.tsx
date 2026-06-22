"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MoreHorizontal,
  ExternalLink,
  Edit,
  Trash2,
  Mail,
  Calendar,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserFormDialog } from "./user-form-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";
import { useTableSelection } from "@/hooks/use-table-selection";
import { AccountStatusBulkActions } from "./account-status-bulk-actions";
import { useFormatDate } from "@/components/providers/settings-provider";
import { useDataTablePagination } from "@/hooks/use-data-table-pagination";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AccountStatusBadge } from "@/components/shared/account-status-badge";
import { DataTableBulkActions } from "@/components/ui/data-table-bulk-actions";
import {
  formatRoleLabel,
  roleBadgeAppearance,
} from "@/components/shared/name-with-role";

interface UsersTableProps {
  users: (User & { rbacRoleName?: string; departmentNames?: string[] })[];
}

export function UsersTable({ users }: UsersTableProps) {
  const formatDate = useFormatDate({ includeTime: false });
  const { data: session } = useSession();
  const canManage =
    (session?.user as { role?: string } | undefined)?.role === "admin";
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const {
    page,
    pageSize,
    pageSizeOptions,
    paginatedItems: paginatedUsers,
    startItem,
    endItem,
    totalItems,
    goToPage,
    updatePageSize,
  } = useDataTablePagination(users);
  const selection = useTableSelection(users, (user) => user.id);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No users found
      </div>
    );
  }

  return (
    <>
      {canManage && (
        <DataTableBulkActions
          selectedCount={selection.selectedCount}
          itemLabel="member"
          onClear={selection.clear}
        >
          <AccountStatusBulkActions
            selectedIds={selection.selectedIdList}
            scope="team"
            onDone={selection.clear}
          />
        </DataTableBulkActions>
      )}

      <div className="rounded-lg overflow-hidden border border-border bg-card/50 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/20 hover:bg-muted/20">
              <TableHead className="h-12 px-4 w-[50px]">
                {canManage && (
                  <Checkbox
                    aria-label="Select all"
                    checked={selection.headerCheckedState}
                    onCheckedChange={() => selection.toggleAll()}
                    className="border-border/60"
                  />
                )}
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                User
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                Role
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                Status
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                Department
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                Country
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                Joined
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider w-[100px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-background/50">
            {paginatedUsers.map((user) => (
              <TableRow
                key={user.id}
                data-state={
                  selection.isSelected(user.id) ? "selected" : undefined
                }
                className={cn(
                  "border-b border-border/30 hover:bg-muted/30 transition-all duration-200 group",
                  selection.isSelected(user.id) && "bg-primary/5",
                )}
              >
                <TableCell className="py-3.5 px-4">
                  {canManage && (
                    <Checkbox
                      aria-label={`Select user ${user.name}`}
                      checked={selection.isSelected(user.id)}
                      onCheckedChange={() => selection.toggle(user.id)}
                      className="border-border/60"
                    />
                  )}
                </TableCell>
                <TableCell className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {user.image && (
                        <AvatarImage
                          src={user.image}
                          alt={user.name || "User"}
                        />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {user.name}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground/70 mt-0.5">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3.5 px-4">
                  {user.rbacRoleName ? (
                    <Badge
                      variant="outline"
                      className="font-medium border-violet-200 text-violet-600 dark:border-violet-500/30 dark:text-violet-400 bg-transparent"
                    >
                      {user.rbacRoleName}
                    </Badge>
                  ) : (
                    (() => {
                      const appearance = roleBadgeAppearance(user.role);
                      return (
                        <Badge
                          variant={appearance.variant}
                          className={cn(
                            "capitalize font-medium",
                            appearance.className,
                          )}
                        >
                          {formatRoleLabel(user.role)}
                        </Badge>
                      );
                    })()
                  )}
                </TableCell>
                <TableCell className="py-3.5 px-4">
                  <AccountStatusBadge status={user.status} />
                </TableCell>
                <TableCell className="py-3.5 px-4">
                  {user.departmentNames && user.departmentNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {user.departmentNames.map((dept) => (
                        <Badge
                          key={dept}
                          variant="outline"
                          className="font-medium text-xs border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                        >
                          {dept}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground/60">—</span>
                  )}
                </TableCell>
                <TableCell className="py-3.5 px-4">
                  <span className="text-sm text-foreground/80">
                    {user.country || "—"}
                  </span>
                </TableCell>
                <TableCell className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground/70">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(user.createdAt)}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-muted/60 transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="cursor-pointer"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleEdit(user)}
                          className="cursor-pointer"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(user)}
                          className="text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <DataTablePagination
          page={page}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          totalItems={totalItems}
          startItem={startItem}
          endItem={endItem}
          onPageChange={goToPage}
          onPageSizeChange={updatePageSize}
        />
      </div>

      <UserFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        mode="edit"
        entityLabel="Team Member"
        audience="team"
      />

      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        user={selectedUser}
      />
    </>
  );
}
