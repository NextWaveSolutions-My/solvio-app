"use client";

import Link from "next/link";
import { useState } from "react";
import type { User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "@/lib/auth-client";
import {
  MoreHorizontal,
  ExternalLink,
  Edit,
  Trash2,
  Mail,
  Calendar,
  MapPin,
  Ticket,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useFormatDate } from "@/components/providers/settings-provider";
import { AccountStatusBadge } from "@/components/shared/account-status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserFormDialog } from "./user-form-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";

interface ClientUser extends User {
  ticketCount: number;
  openTickets: number;
  resolvedTickets: number;
  lastTicketDate?: Date;
}

interface ClientCardProps {
  client: ClientUser;
}

export function ClientCard({ client }: ClientCardProps) {
  const formatDate = useFormatDate({ includeTime: false });
  const { data: session } = useSession();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const canManageCustomer = (session?.user as { role?: string } | undefined)?.role === "admin";
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="group relative flex flex-col bg-card/50 backdrop-blur-sm border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
            {client.image && (
              <AvatarImage src={client.image} alt={client.name || "User"} />
            )}
            <AvatarFallback className="bg-info/10 text-info font-semibold">
              {getInitials(client.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-foreground line-clamp-1">
              {client.name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {client.envatoUsername && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-5 font-normal"
                >
                  @{client.envatoUsername}
                </Badge>
              )}
              <AccountStatusBadge
                status={client.status}
                className="h-5 px-1.5 py-0 text-[10px]"
              />
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mr-2 -mt-2 text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
                onClick={() => setEditDialogOpen(true)}
                className="cursor-pointer"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Customer
              </DropdownMenuItem>
            )}
            {canManageCustomer && <DropdownMenuSeparator />}
            {canManageCustomer && (
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Customer
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2.5 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{client.email}</span>
        </div>
        {client.country && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{client.country}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>
            Joined {formatDate(client.createdAt)}
          </span>
        </div>
      </div>

      {/* Ticket Stats */}
      <div className="mb-4 grid grid-cols-3 gap-2 border-t border-border py-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
            <Ticket className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-wider font-medium">
              Total
            </span>
          </div>
          <div className="text-sm font-bold">{client.ticketCount}</div>
        </div>
        <div className="text-center border-l border-border">
          <div className="flex items-center justify-center gap-1 text-warning mb-0.5">
            <Clock className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-wider font-medium">
              Open
            </span>
          </div>
          <div className="text-sm font-bold text-warning">
            {client.openTickets}
          </div>
        </div>
        <div className="text-center border-l border-border">
          <div className="flex items-center justify-center gap-1 text-success mb-0.5">
            <CheckCircle2 className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-wider font-medium">
              Done
            </span>
          </div>
          <div className="text-sm font-bold text-success">
            {client.resolvedTickets}
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          className="w-full hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-colors"
          asChild
        >
          <Link href={`/admin/customers/${client.id}`}>View Profile</Link>
        </Button>
      </div>

      <UserFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={client}
        mode="edit"
        entityLabel="Customer"
      />

      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        user={client}
        entityLabel="Customer"
      />
    </div>
  );
}
