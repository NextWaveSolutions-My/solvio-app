"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { UserFormDialog } from "./user-form-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";

interface ClientDetailActionsProps {
  user: User;
  isAdmin: boolean;
}

export function ClientDetailActions({ user, isAdmin }: ClientDetailActionsProps) {
  const router = useRouter();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteSuccess = () => {
    // Redirect to customers list after successful deletion
    router.push("/admin/customers");
  };

  return (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Customer
        </Button>
      )}
      {isAdmin && (
        <Button
          variant="outline"
          onClick={() => setDeleteDialogOpen(true)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Customer
        </Button>
      )}

      {/* Edit Customer Dialog */}
      {isAdmin && (
        <UserFormDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          user={user}
          mode="edit"
          entityLabel="Customer"
        />
      )}

      {/* Delete Customer Dialog */}
      {isAdmin && (
        <DeleteUserDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open && !user) {
              // If dialog closed and user was deleted, redirect
              handleDeleteSuccess();
            }
          }}
          user={user}
          entityLabel="Customer"
        />
      )}
    </div>
  );
}
