"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Loader2, CircleDot, Flag, UserPlus } from "lucide-react";
import {
    bulkUpdateTicketStatus,
    bulkUpdateTicketPriority,
    bulkAssignTickets,
    getAssignableAgents,
} from "@/actions/admin";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type TicketStatusValue =
    | "open"
    | "in_progress"
    | "waiting_on_customer"
    | "resolved"
    | "closed";
type TicketPriorityValue = "low" | "medium" | "high" | "urgent";

const STATUS_OPTIONS: { value: TicketStatusValue; label: string }[] = [
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "waiting_on_customer", label: "Waiting on Customer" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS: { value: TicketPriorityValue; label: string }[] = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" },
];

interface Agent {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface TicketBulkActionsProps {
    selectedIds: string[];
    /** Called after a successful update (used to clear the selection). */
    onDone: () => void;
}

export function TicketBulkActions({
    selectedIds,
    onDone,
}: TicketBulkActionsProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [agentsState, setAgentsState] = useState<
        "idle" | "loading" | "loaded"
    >("idle");

    const apply = (work: () => Promise<{ success: boolean; message?: string; error?: string }>) => {
        startTransition(async () => {
            const result = await work();
            if (result.success) {
                toast.success(result.message || "Tickets updated");
                onDone();
                router.refresh();
            } else {
                toast.error(result.error || result.message || "Failed to update tickets");
            }
        });
    };

    const loadAgents = async () => {
        if (agentsState !== "idle") return;
        setAgentsState("loading");
        const result = await getAssignableAgents();
        if (result.success && result.data) {
            setAgents(result.data);
        }
        setAgentsState("loaded");
    };

    return (
        <>
            {/* Status */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8" disabled={isPending}>
                        <CircleDot className="mr-1.5 h-3.5 w-3.5" />
                        Status
                        <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Set status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {STATUS_OPTIONS.map((option) => (
                        <DropdownMenuItem
                            key={option.value}
                            className="cursor-pointer"
                            onClick={() =>
                                apply(() =>
                                    bulkUpdateTicketStatus(selectedIds, option.value),
                                )
                            }
                        >
                            {option.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Priority */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8" disabled={isPending}>
                        <Flag className="mr-1.5 h-3.5 w-3.5" />
                        Priority
                        <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel>Set priority</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {PRIORITY_OPTIONS.map((option) => (
                        <DropdownMenuItem
                            key={option.value}
                            className="cursor-pointer capitalize"
                            onClick={() =>
                                apply(() =>
                                    bulkUpdateTicketPriority(selectedIds, option.value),
                                )
                            }
                        >
                            {option.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Assign */}
            <DropdownMenu
                onOpenChange={(open) => {
                    if (open) void loadAgents();
                }}
            >
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8" disabled={isPending}>
                        <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                        Assign
                        <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
                    <DropdownMenuLabel>Assign to</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => apply(() => bulkAssignTickets(selectedIds, null))}
                    >
                        Unassigned
                    </DropdownMenuItem>
                    {agentsState === "loading" && (
                        <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Loading agents...
                        </div>
                    )}
                    {agentsState === "loaded" && agents.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No agents available
                        </div>
                    )}
                    {agents.map((agent) => (
                        <DropdownMenuItem
                            key={agent.id}
                            className="cursor-pointer"
                            onClick={() =>
                                apply(() => bulkAssignTickets(selectedIds, agent.id))
                            }
                        >
                            <div className="flex min-w-0 flex-col">
                                <span className="truncate text-sm">{agent.name}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {agent.email}
                                </span>
                            </div>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {isPending && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
        </>
    );
}
