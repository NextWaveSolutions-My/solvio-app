"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormatDate } from "@/components/providers/settings-provider";
import type { User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatRoleLabel, roleBadgeAppearance } from "@/components/shared/name-with-role";
import { AccountStatusBadge } from "@/components/shared/account-status-badge";
import {
    MoreHorizontal,
    ExternalLink,
    Edit,
    Trash2,
    Mail,
    Calendar,
    MapPin,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserFormDialog } from "./user-form-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";

interface UserCardProps {
    user: User & { rbacRoleName?: string };
}

export function UserCard({ user }: UserCardProps) {
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const formatDate = useFormatDate({ includeTime: false });

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <>
            <div className="group relative flex flex-col bg-card/50 backdrop-blur-sm border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                            {user.image && (
                                <AvatarImage src={user.image} alt={user.name || "User"} />
                            )}
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {getInitials(user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-semibold text-foreground line-clamp-1">
                                {user.name}
                            </h3>
                            {user.rbacRoleName ? (
                                <Badge
                                    variant="outline"
                                    className="mt-1 text-[10px] px-1.5 py-0 h-5 border-violet-200 text-violet-600 dark:border-violet-500/30 dark:text-violet-400 bg-transparent"
                                >
                                    {user.rbacRoleName}
                                </Badge>
                            ) : (() => {
                                const appearance = roleBadgeAppearance(user.role);
                                return (
                            <Badge
                                variant={appearance.variant}
                                className={cn(
                                    "mt-1 capitalize text-[10px] px-1.5 py-0 h-5",
                                    appearance.className,
                                )}
                            >
                                {formatRoleLabel(user.role)}
                            </Badge>
                                );
                            })()}
                            <AccountStatusBadge
                                status={user.status}
                                className="mt-1 ml-1.5 h-5 px-1.5 py-0 text-[10px]"
                            />
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
                                    href={`/admin/users/${user.id}`}
                                    className="cursor-pointer"
                                >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    View Details
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setEditDialogOpen(true)}
                                className="cursor-pointer"
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => setDeleteDialogOpen(true)}
                                className="text-destructive focus:text-destructive cursor-pointer"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="space-y-2.5 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{user.email}</span>
                    </div>
                    {user.country && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{user.country}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>
                            Joined {formatDate(user.createdAt)}
                        </span>
                    </div>
                </div>

                <div className="mt-auto border-t border-border pt-4 flex items-center justify-between">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-colors"
                        asChild
                    >
                        <Link href={`/admin/users/${user.id}`}>View Profile</Link>
                    </Button>
                </div>
            </div>

            <UserFormDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                user={user}
                mode="edit"
                entityLabel="Team Member"
                audience="team"
            />

            <DeleteUserDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                user={user}
            />
        </>
    );
}
