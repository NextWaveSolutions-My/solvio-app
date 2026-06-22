import { ObjectId } from "mongodb";
import type { User } from "@/types";
import { getCollection } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { getServicesForNav } from "@/actions/services";
import { AdminNav } from "@/components/layout/admin-nav";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { requireAuth, requirePermission } from "@/lib/auth-utils";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  await requirePermission(["panel.admin.access", "panel.support.access"], {
    any: true,
  });
  const sessionUser = session.user as SessionUser;
  const userRole = sessionUser.role ?? "customer";

  const users = await getCollection<User>("user");
  let userDoc = await users.findOne({ id: sessionUser.id });
  if (!userDoc && ObjectId.isValid(sessionUser.id)) {
    userDoc = await users.findOne({
      _id: new ObjectId(sessionUser.id),
    });
  }

  const user = {
    id: sessionUser.id,
    name: sessionUser.name ?? "Unknown User",
    email: sessionUser.email ?? "",
    role: userRole,
    image: userDoc?.image ?? sessionUser.image ?? "",
  };

  // Get user's notification click behavior preference
  const notificationClickBehavior =
    userDoc?.preferences?.notifications?.clickBehavior ?? "detail";

  const servicesResult = await getServicesForNav();
  const services = servicesResult.success && servicesResult.data ? servicesResult.data : [];

  return (
    <div className="min-h-screen w-full bg-surface flex">
      {/* Sidebar */}
      <AppSidebar user={user}>
        <AdminNav userRole={userRole} services={services} />
      </AppSidebar>

      {/* Main Content with Header */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Sticky */}
        <div className="sticky top-0 z-40 shrink-0">
          <AppHeader
            user={user}
            notificationClickBehavior={notificationClickBehavior}
            services={services.map((s) => ({ name: s.name, slug: s.slug }))}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-x-clip bg-surface">
          <div className="mx-auto p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
