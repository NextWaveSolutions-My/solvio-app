import type { User } from "@/types";
import { getCollection } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { requireAuth } from "@/lib/auth-utils";
import { ObjectId, type Filter } from "mongodb";
import { ProfileForm } from "@/components/profile/profile-form";
import { NotificationPreferences } from "@/components/profile/notification-preferences";
import { Shield } from "lucide-react";

// Disable static generation for this page since it has dynamic data
export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const session = await requireAuth();
  const role = (session.user as SessionUser).role || "customer";
  if (role !== "admin" && role !== "support") {
    // In admin route group, but double-guard
    // Redirect is handled by (admin) layout; we still show nothing if somehow accessed
    return null;
  }

  const users = await getCollection<User>("user");
  let user = await users.findOne({ id: session.user.id } as Filter<User>);
  if (!user && ObjectId.isValid(session.user.id)) {
    user = await users.findOne({
      _id: new ObjectId(session.user.id),
    } as Filter<User>);
  }

  const initialData = {
    id: user?.id || session.user.id,
    name: user?.name || session.user.name || "",
    email: user?.email || session.user.email || "",
    phone: user?.phone || "",
    envatoUsername: user?.envatoUsername || "",
    country: user?.country || "",
    image: user?.image || session.user.image || "",
    role,
    createdAt: (user?.createdAt
      ? new Date(user.createdAt)
      : new Date()
    ).toISOString(),
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-2">
      {/* Header Section */}
      <div className="space-y-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Profile Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your account preferences and security
          </p>
        </div>
      </div>

      {/* Privileges Section */}
      <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Your Permissions
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="secondary"
            className="rounded-lg px-3 py-1.5 text-xs font-medium bg-primary/5 text-primary border-0 hover:bg-primary/10"
          >
            Manage Users
          </Badge>
          <Badge
            variant="secondary"
            className="rounded-lg px-3 py-1.5 text-xs font-medium bg-primary/5 text-primary border-0 hover:bg-primary/10"
          >
            Access All Tickets
          </Badge>
          <Badge
            variant="secondary"
            className="rounded-lg px-3 py-1.5 text-xs font-medium bg-primary/5 text-primary border-0 hover:bg-primary/10"
          >
            Update Settings
          </Badge>
          {role === "support" && (
            <Badge
              variant="secondary"
              className="rounded-lg px-3 py-1.5 text-xs font-medium bg-primary/5 text-primary border-0 hover:bg-primary/10"
            >
              Support Tools
            </Badge>
          )}
        </div>
      </div>

      {/* Profile Form */}
      <ProfileForm initialData={initialData} />

      {/* Notification Preferences */}
      <NotificationPreferences />
    </div>
  );
}
