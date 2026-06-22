import { ObjectId } from "mongodb";
import type { User } from "@/types";
import { getCollection } from "@/lib/db";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-utils";
import type { SessionUser } from "@/lib/auth";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { getServicesForNav } from "@/actions/services";
import { getSystemSettings } from "@/lib/settings-utils";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const sessionUser = session.user as SessionUser;

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
    role: sessionUser.role ?? "customer",
    image: userDoc?.image ?? sessionUser.image ?? "",
  };

  const systemSettings = await getSystemSettings();
  const maintenanceEnabled = systemSettings.maintenance?.enabled;
  if (maintenanceEnabled) {
    const allowAdmin = systemSettings.maintenance?.allowAdmin ?? true;
    const allowSupport = systemSettings.maintenance?.allowSupport ?? true;
    const isAllowed =
      (user.role === "admin" && allowAdmin) ||
      (user.role === "support" && allowSupport);
    if (!isAllowed) {
      redirect("/maintenance");
    }
  }

  // Get user's notification click behavior preference
  const notificationClickBehavior =
    userDoc?.preferences?.notifications?.clickBehavior ?? "detail";

  const servicesResult = await getServicesForNav();
  const services = servicesResult.success && servicesResult.data ? servicesResult.data : [];

  return (
    <div className="h-screen bg-surface flex overflow-hidden">
      {/* Sidebar */}
      <AppSidebar user={user} variant="dashboard">
        <DashboardNav services={services} />
      </AppSidebar>

      {/* Main Content with Header */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <AppHeader
          user={user}
          notificationClickBehavior={notificationClickBehavior}
          services={services.map((s) => ({ name: s.name, slug: s.slug }))}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-surface">
          <div className="mx-auto p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
