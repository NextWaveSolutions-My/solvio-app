"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormatDate } from "@/components/providers/settings-provider";
import type { User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "@/lib/auth-client";
import {
    MoreHorizontal,
    ExternalLink,
    Edit,
    Trash2,
    Mail,
    Calendar,
    Ticket,
    CheckCircle2,
    Clock,
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useDataTablePagination } from "@/hooks/use-data-table-pagination";
import { useTableSelection } from "@/hooks/use-table-selection";
import { DataTableBulkActions } from "@/components/ui/data-table-bulk-actions";
import { AccountStatusBulkActions } from "./account-status-bulk-actions";
import { AccountStatusBadge } from "@/components/shared/account-status-badge";
import { cn } from "@/lib/utils";
import { UserFormDialog } from "./user-form-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";

interface ClientUser extends User {
    ticketCount: number;
    openTickets: number;
    resolvedTickets: number;
    lastTicketDate?: Date;
}

interface ClientsTableProps {
    clients: ClientUser[];
}

export function ClientsTable({ clients }: ClientsTableProps) {
    const formatDate = useFormatDate({ includeTime: false });
    const { data: session } = useSession();
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<ClientUser | null>(null);
    const {
        page,
        pageSize,
        pageSizeOptions,
        paginatedItems: paginatedClients,
        startItem,
        endItem,
        totalItems,
        goToPage,
        updatePageSize,
    } = useDataTablePagination(clients);
    const selection = useTableSelection(clients, (client) => client.id);
    const canManageCustomer = (session?.user as { role?: string } | undefined)?.role === "admin";
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const handleEdit = (customer: ClientUser) => {
        setSelectedCustomer(customer);
        setEditDialogOpen(true);
    };

    const handleDelete = (customer: ClientUser) => {
        setSelectedCustomer(customer);
        setDeleteDialogOpen(true);
    };

    if (clients.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No customers found
            </div>
        );
    }

    return (
        <>
            {canManageCustomer && (
                <DataTableBulkActions
                    selectedCount={selection.selectedCount}
                    itemLabel="customer"
                    onClear={selection.clear}
                >
                    <AccountStatusBulkActions
                        selectedIds={selection.selectedIdList}
                        scope="customer"
                        onDone={selection.clear}
                    />
                </DataTableBulkActions>
            )}

            <div className="rounded-lg overflow-hidden border border-border bg-card/50 backdrop-blur-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-border bg-muted/20 hover:bg-muted/20">
                            <TableHead className="h-12 px-4 w-[50px]">
                                {canManageCustomer && (
                                    <Checkbox
                                        aria-label="Select all"
                                        checked={selection.headerCheckedState}
                                        onCheckedChange={() => selection.toggleAll()}
                                        className="border-border/60"
                                    />
                                )}
                            </TableHead>
                            <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                                Customer
                            </TableHead>
                            <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                                Envato Username
                            </TableHead>
                            <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                                Status
                            </TableHead>
                            <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                                Tickets
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
                        {paginatedClients.map((client) => (
                            <TableRow
                                key={client.id}
                                data-state={
                                    selection.isSelected(client.id) ? "selected" : undefined
                                }
                                className={cn(
                                    "border-b border-border/30 hover:bg-muted/30 transition-all duration-200 group",
                                    selection.isSelected(client.id) && "bg-primary/5",
                                )}
                            >
                                <TableCell className="py-3.5 px-4">
                                    {canManageCustomer && (
                                        <Checkbox
                                            aria-label={`Select customer ${client.name}`}
                                            checked={selection.isSelected(client.id)}
                                            onCheckedChange={() => selection.toggle(client.id)}
                                            className="border-border/60"
                                        />
                                    )}
                                </TableCell>
                                <TableCell className="py-3.5 px-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            {client.image && (
                                                <AvatarImage src={client.image} alt={client.name || "User"} />
                                            )}
                                            <AvatarFallback className="bg-info/10 text-info text-xs font-medium">
                                                {getInitials(client.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm text-foreground truncate">
                                                {client.name}
                                            </p>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground/70 mt-0.5">
                                                <Mail className="h-3 w-3" />
                                                <span className="truncate">{client.email}</span>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-3.5 px-4">
                                    {client.envatoUsername ? (
                                        <Badge variant="outline" className="font-normal">
                                            @{client.envatoUsername}
                                        </Badge>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">—</span>
                                    )}
                                </TableCell>
                                <TableCell className="py-3.5 px-4">
                                    <AccountStatusBadge status={client.status} />
                                </TableCell>
                                <TableCell className="py-3.5 px-4">
                                    <div className="flex items-center gap-4 text-xs">
                                        <div className="flex items-center gap-1.5" title="Total Tickets">
                                            <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="font-medium">{client.ticketCount}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5" title="Open Tickets">
                                            <Clock className="h-3.5 w-3.5 text-warning" />
                                            <span className="font-medium text-warning">
                                                {client.openTickets}
                                            </span>
                                        </div>
                                        <div
                                            className="flex items-center gap-1.5"
                                            title="Resolved Tickets"
                                        >
                                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                                            <span className="font-medium text-success">
                                                {client.resolvedTickets}
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-3.5 px-4">
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground/70">
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>
                                            {formatDate(client.createdAt)}
                                        </span>
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
                                            <DropdownMenuContent align="end" className="w-44">
                                                <DropdownMenuItem asChild>
                                                    <Link
                                                        href={`/admin/customers/${client.id}`}
                                                        className="cursor-pointer"
                                                    >
                                                        <ExternalLink className="mr-2 h-4 w-4" />
                                                        View Details
                                                    </Link>
                                                </DropdownMenuItem>
                                                {canManageCustomer && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleEdit(client)}
                                                        className="cursor-pointer"
                                                    >
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit Customer
                                                    </DropdownMenuItem>
                                                )}
                                                {canManageCustomer && <DropdownMenuSeparator />}
                                                {canManageCustomer && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(client)}
                                                        className="text-destructive focus:text-destructive cursor-pointer"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete Customer
                                                    </DropdownMenuItem>
                                                )}
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
                user={selectedCustomer}
                mode="edit"
                entityLabel="Customer"
            />

            <DeleteUserDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                user={selectedCustomer}
                entityLabel="Customer"
            />
        </>
    );
}
