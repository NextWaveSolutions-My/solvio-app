import type { User } from "@/types";
import { Card } from "@/components/ui/card";
import { getAllUsers } from "@/actions/admin";
import { listRbacRoles } from "@/lib/rbac-store";
import { UserCard } from "@/components/admin/user-card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { StatsGrid } from "@/components/shared/stats-grid";
import { UsersTable } from "@/components/admin/users-table";
import { ViewToggle } from "@/components/tickets/view-toggle";
import { getTicketDepartments } from "@/actions/ticket-departments";
import { Users, Headset, ShieldAlert, UserCog } from "lucide-react";
import { PageTabsHeader } from "@/components/shared/page-tabs-header";
import { CreateUserButton } from "@/components/admin/create-user-button";
import { EmptySearchResults } from "@/components/shared/empty-search-results";

// Disable static generation for this page since it has dynamic data
export const dynamic = "force-dynamic";

type TeamMember = User & {
  rbacRoleName?: string;
  isCustomRole: boolean;
  departmentNames: string[];
};

interface UsersPageProps {
  searchParams: Promise<{
    role?: string;
    search?: string;
    view?: string;
  }>;
}

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const filters = {
    role: params.role,
    search: params.search,
  };

  // Get users with filters
  const usersResult = await getAllUsers(filters);
  const users = usersResult.success ? usersResult.data || [] : [];

  // Serialize users to remove MongoDB ObjectId
  const serializedUsers: User[] = JSON.parse(JSON.stringify(users));

  // Build a map of custom (non-system) RBAC roles so we can label and bucket
  // users that have been assigned a custom role.
  const rbacRoles = await listRbacRoles();
  const customRoleNames = new Map<string, string>();
  for (const role of rbacRoles) {
    if (!role.isSystem) {
      customRoleNames.set(role._id.toString(), role.name);
    }
  }

  // Map department slugs to display names so support staff coverage is readable.
  const departmentsResult = await getTicketDepartments();
  const departmentNameBySlug = new Map<string, string>();
  if (departmentsResult.success && departmentsResult.data) {
    for (const dept of departmentsResult.data) {
      departmentNameBySlug.set(dept.slug, dept.name);
    }
  }

  // Enrich each user with their custom role name and department names (if any).
  const enrichedUsers: TeamMember[] = serializedUsers.map((u) => {
    const rbacRoleName = u.rbacRoleId
      ? customRoleNames.get(u.rbacRoleId)
      : undefined;
    const departmentNames = (u.departmentSlugs || []).map(
      (slug) => departmentNameBySlug.get(slug) || slug
    );
    return {
      ...u,
      rbacRoleName,
      isCustomRole: Boolean(rbacRoleName),
      departmentNames,
    };
  });

  const viewMode = params.view === "card" ? "card" : "table";

  // Team members = everyone who is not a customer (admins, support, custom roles).
  const teamMembers = enrichedUsers.filter((u) => u.role !== "customer");

  // Mutually exclusive buckets so counts sum to the total. A user assigned a
  // custom role is grouped under "Custom Roles"; default admins/support keep
  // their base-role bucket.
  const customRoleUsers = teamMembers.filter((u) => u.isCustomRole);
  const adminUsers = teamMembers.filter(
    (u) => u.role === "admin" && !u.isCustomRole
  );
  const supportUsers = teamMembers.filter(
    (u) => u.role === "support" && !u.isCustomRole
  );

  const userStats = [
    {
      title: "Team Members",
      value: teamMembers.length,
      icon: Users,
      iconColor: "text-slate-600",
      iconBgColor: "bg-slate-50 dark:bg-slate-950",
      description: "Admins, support, and custom roles",
    },
    {
      title: "Admins",
      value: adminUsers.length,
      icon: ShieldAlert,
      iconColor: "text-rose-600",
      iconBgColor: "bg-rose-50 dark:bg-rose-950",
      description: "System administrators",
    },
    {
      title: "Support Staff",
      value: supportUsers.length,
      icon: Headset,
      iconColor: "text-indigo-600",
      iconBgColor: "bg-indigo-50 dark:bg-indigo-950",
      description: "Support agents",
    },
    {
      title: "Custom Roles",
      value: customRoleUsers.length,
      icon: UserCog,
      iconColor: "text-violet-600",
      iconBgColor: "bg-violet-50 dark:bg-violet-950",
      description: "Custom permission roles",
    },
  ];

  const tabItems = [
    { value: "all", label: "All Team Members", count: teamMembers.length },
    { value: "admin", label: "Admins", count: adminUsers.length },
    { value: "support", label: "Support Staff", count: supportUsers.length },
    { value: "custom", label: "Custom Roles", count: customRoleUsers.length },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Members</h1>
          <p className="text-muted-foreground mt-2">
            Manage admin, support, and custom-role accounts
          </p>
        </div>
        <CreateUserButton />
      </div>

      {/* Statistics */}
      <StatsGrid stats={userStats} />

      {/* Team Members List */}
      <Card className="rounded-lg p-4">
        <Tabs defaultValue="all">
          <PageTabsHeader
            tabs={tabItems}
            showSearch
            searchPlaceholder="Search team members..."
            searchDefaultValue={filters.search}
            rightActions={<ViewToggle />}
          />

          <TabsContent
            value="all"
            className={
              viewMode === "card"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : ""
            }
          >
            {teamMembers.length === 0 ? (
              <EmptySearchResults
                searchQuery={filters.search}
                entityName="team members"
              />
            ) : viewMode === "table" ? (
              <UsersTable users={teamMembers} />
            ) : (
              teamMembers.map((user) => (
                <UserCard key={user.id} user={user} />
              ))
            )}
          </TabsContent>

          <TabsContent
            value="admin"
            className={
              viewMode === "card"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : ""
            }
          >
            {adminUsers.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No admins found
              </div>
            ) : viewMode === "table" ? (
              <UsersTable users={adminUsers} />
            ) : (
              adminUsers.map((user) => (
                <UserCard key={user.id} user={user} />
              ))
            )}
          </TabsContent>

          <TabsContent
            value="support"
            className={
              viewMode === "card"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : ""
            }
          >
            {supportUsers.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No support staff found
              </div>
            ) : viewMode === "table" ? (
              <UsersTable users={supportUsers} />
            ) : (
              supportUsers.map((user) => (
                <UserCard key={user.id} user={user} />
              ))
            )}
          </TabsContent>

          <TabsContent
            value="custom"
            className={
              viewMode === "card"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : ""
            }
          >
            {customRoleUsers.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No custom-role members found
              </div>
            ) : viewMode === "table" ? (
              <UsersTable users={customRoleUsers} />
            ) : (
              customRoleUsers.map((user) => (
                <UserCard key={user.id} user={user} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
