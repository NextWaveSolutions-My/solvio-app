"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Ban, PauseCircle, Loader2 } from "lucide-react";
import { bulkUpdateUserStatus } from "@/actions/admin";
import type { AccountStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface AccountStatusBulkActionsProps {
    selectedIds: string[];
    /** "team" → users.manage gate, "customer" → clients.manage gate. */
    scope: "team" | "customer";
    /** Called after a successful update (used to clear the selection). */
    onDone: () => void;
}

export function AccountStatusBulkActions({
    selectedIds,
    scope,
    onDone,
}: AccountStatusBulkActionsProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    // Disable/Ban are confirmed via dialog; Activate runs immediately.
    const [confirm, setConfirm] = useState<"disabled" | "banned" | null>(null);
    const [reason, setReason] = useState("");

    const count = selectedIds.length;
    const noun = scope === "customer" ? "customer" : "member";
    const nounPlural = `${noun}${count === 1 ? "" : "s"}`;

    const run = (status: AccountStatus, withReason?: string) => {
        startTransition(async () => {
            const result = await bulkUpdateUserStatus(
                selectedIds,
                status,
                scope,
                withReason,
            );
            if (result.success) {
                toast.success(result.message || "Status updated");
                setConfirm(null);
                setReason("");
                onDone();
                router.refresh();
            } else {
                toast.error(result.error || "Failed to update status");
            }
        });
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => run("active")}
                className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Activate
            </Button>
            <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => setConfirm("disabled")}
                className="h-8 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-950/40"
            >
                <PauseCircle className="mr-1.5 h-3.5 w-3.5" />
                Disable
            </Button>
            <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => setConfirm("banned")}
                className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
                <Ban className="mr-1.5 h-3.5 w-3.5" />
                Ban
            </Button>

            <AlertDialog
                open={confirm !== null}
                onOpenChange={(open) => {
                    if (!open && !isPending) {
                        setConfirm(null);
                        setReason("");
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirm === "banned" ? "Ban" : "Disable"} {count}{" "}
                            {nounPlural}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirm === "banned"
                                ? `The selected ${nounPlural} will be banned, signed out immediately, and blocked from signing in until reactivated.`
                                : `The selected ${nounPlural} will be disabled, signed out immediately, and unable to sign in until reactivated.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="bulk-status-reason">Reason (optional)</Label>
                        <Textarea
                            id="bulk-status-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={
                                confirm === "banned"
                                    ? "e.g. Repeated abuse / policy violation"
                                    : "e.g. Temporary deactivation pending review"
                            }
                            rows={3}
                            disabled={isPending}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isPending}
                            onClick={(e) => {
                                e.preventDefault();
                                if (confirm) run(confirm, reason);
                            }}
                            className={
                                confirm === "banned"
                                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    : "bg-amber-600 text-white hover:bg-amber-600/90"
                            }
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Working...
                                </>
                            ) : confirm === "banned" ? (
                                "Ban"
                            ) : (
                                "Disable"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
