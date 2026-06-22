import Link from "next/link";
import { ObjectId } from "mongodb";
import type { User } from "@/types";
import { getCollection } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { User as UserIcon } from "lucide-react";
import { ProfileForm } from "@/components/profile/profile-form";
import { NotificationPreferences } from "@/components/profile/notification-preferences";

// Disable static generation for this page since it has dynamic data
export const dynamic = "force-dynamic";

export default async function CustomerProfilePage() {
  const session = await requireAuth();
  const role = (session.user as { role?: string }).role || "customer";

  // If somehow an admin/support lands here, they should use the admin profile
  if (role === "admin" || role === "support") {
    // Prefer redirect on the client by link nav; this page is guarded by (dashboard) layout
  }

  const users = await getCollection<User>("user");
  let user = await users.findOne({ id: session.user.id } as { id: string });
  if (!user && ObjectId.isValid(session.user.id)) {
    user = await users.findOne({ _id: new ObjectId(session.user.id) } as { _id: ObjectId });
  }

  const initialData = {
    id: user?.id || session.user.id,
    name: user?.name || session.user.name || "",
    email: user?.email || session.user.email || "",
    phone: (user as User & { phone?: string })?.phone || "",
    envatoUsername:
      (user as User & { envatoUsername?: string })?.envatoUsername || "",
    country: (user as User & { country?: string })?.country || "",
    image: user?.image || (session.user as { image?: string }).image || "",
    role,
    createdAt: (user?.createdAt
      ? new Date(user.createdAt)
      : new Date()
    ).toISOString(),
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-6">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-foreground sm:text-xl">Your Profile</h1>
              <nav className="mt-1 hidden items-center text-sm text-muted-foreground sm:flex">
                <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
                <span className="mx-2">•</span>
                <span className="text-foreground">Profile</span>
              </nav>
            </div>
            <div className="relative h-16 w-16 self-start sm:h-20 sm:w-20 sm:self-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full" />
              <div className="absolute inset-2 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <ProfileForm initialData={initialData} />
          <NotificationPreferences />
        </div>
      </div>
    </div>
  );
}
