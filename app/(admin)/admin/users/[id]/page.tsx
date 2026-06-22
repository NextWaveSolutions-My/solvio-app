import {
  Mail,
  Calendar,
  MapPin,
  Shield,
  Ticket,
  CheckCircle2,
  Clock,
  XCircle,
  Activity,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/settings-utils";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getUserDetails } from "@/actions/admin";
import type { Ticket as TicketType } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserDetailActions } from "@/components/admin/user-detail-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Serialized types (after JSON.parse(JSON.stringify()))
type SerializedTicket = Omit<
  TicketType,
  | "_id"
  | "createdAt"
  | "updatedAt"
  | "lastActivityAt"
  | "resolvedAt"
  | "closedAt"
  | "purchaseVerification"
> & {
  id: string; // Required - converted from _id
  createdAt?: string;
  updatedAt?: string;
  lastActivityAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  purchaseVerification?: Omit<
    TicketType["purchaseVerification"],
    "purchaseDate" | "supportedUntil" | "verifiedAt"
  > & {
    purchaseDate?: string;
    supportedUntil?: string;
    verifiedAt?: string;
  };
};

type SerializedSession = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
};

interface UserDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;
  const result = await getUserDetails(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const { user, tickets, sessions, stats, account, currentUserRole } =
    result.data;

  // Serialize data to avoid MongoDB ObjectId issues
  const serializedUser = JSON.parse(JSON.stringify(user));
  const serializedTickets = JSON.parse(JSON.stringify(tickets));
  const serializedSessions = JSON.parse(JSON.stringify(sessions));

  // Pre-format dates for tickets to avoid await in JSX map
  const ticketsWithDates = await Promise.all(
    serializedTickets.map(async (ticket: SerializedTicket) => ({
      ...ticket,
      formattedCreatedAt: ticket.createdAt
        ? await formatDate(new Date(ticket.createdAt))
        : null,
    }))
  );

  // Pre-format dates for sessions to avoid await in JSX map
  const sessionsWithDates = await Promise.all(
    serializedSessions.map(async (session: SerializedSession) => ({
      ...session,
      formattedCreatedAt: await formatDate(new Date(session.createdAt)),
      formattedUpdatedAt: await formatDate(new Date(session.updatedAt)),
      formattedExpiresAt: await formatDate(new Date(session.expiresAt)),
    }))
  );

  // Check if current user is admin
  const isAdmin = currentUserRole === "admin";

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return {
          variant: "destructive" as const,
          className: "text-white dark:text-white",
        };
      case "support":
        return {
          variant: "default" as const,
          className: "text-white dark:text-white",
        };
      case "customer":
        return {
          variant: "secondary" as const,
          className: "text-foreground dark:text-foreground",
        };
      default:
        return {
          variant: "secondary" as const,
          className: "text-foreground dark:text-foreground",
        };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return {
          variant: "default" as const,
          className: "text-white dark:text-white",
        };
      case "in_progress":
        return {
          variant: "secondary" as const,
          className: "text-foreground dark:text-foreground",
        };
      case "resolved":
        return {
          variant: "outline" as const,
          className: "text-foreground dark:text-foreground",
        };
      case "closed":
        return {
          variant: "secondary" as const,
          className: "text-foreground dark:text-foreground",
        };
      default:
        return {
          variant: "secondary" as const,
          className: "text-foreground dark:text-foreground",
        };
    }
  };

  // Parse user agent to extract browser and OS information
  const parseUserAgent = (userAgent: string) => {
    if (!userAgent || userAgent === "Unknown") {
      return { browser: "Unknown", os: "Unknown", device: "Unknown" };
    }

    let browser = "Unknown";
    let os = "Unknown";
    let device = "Desktop";

    // Detect browser
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
      browser = "Chrome";
    } else if (userAgent.includes("Edg")) {
      browser = "Edge";
    } else if (userAgent.includes("Firefox")) {
      browser = "Firefox";
    } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
      browser = "Safari";
    } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
      browser = "Opera";
    }

    // Detect OS
    if (userAgent.includes("Windows")) {
      os = "Windows";
    } else if (userAgent.includes("Mac OS X")) {
      os = "macOS";
    } else if (userAgent.includes("Linux")) {
      os = "Linux";
    } else if (userAgent.includes("Android")) {
      os = "Android";
      device = "Mobile";
    } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
      os = "iOS";
      device = userAgent.includes("iPad") ? "Tablet" : "Mobile";
    }

    return { browser, os, device };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Details</h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin
                ? "View comprehensive user information and activity"
                : "View user information and assigned tickets"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <UserDetailActions user={serializedUser} isAdmin={isAdmin} />
          <Link href="/admin/users">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              {user.image && <AvatarImage src={user.image} alt={user.name} />}
              <AvatarFallback className="bg-primary-soft text-primary font-semibold text-2xl">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{user.name}</h2>
                  <Badge
                    variant={getRoleBadge(user.role).variant}
                    className={getRoleBadge(user.role).className}
                  >
                    {user.role}
                  </Badge>
                  {user.emailVerified && (
                    <Badge
                      variant="outline"
                      className="gap-1 text-foreground dark:text-foreground"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                {user.country && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{user.country}</span>
                  </div>
                )}
                {isAdmin && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>User ID: {user.id}</span>
                  </div>
                )}
                {isAdmin && user.createdAt && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Joined {await formatDate(new Date(user.createdAt))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div
        className={`grid gap-4 md:grid-cols-2 ${
          isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"
        }`}
      >
        <Card className="gap-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTickets}</div>
          </CardContent>
        </Card>

        <Card className="gap-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openTickets}</div>
          </CardContent>
        </Card>

        <Card className="gap-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Resolved Tickets
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolvedTickets}</div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="gap-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Sessions
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSessions}</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Account Information - Admin Only */}
      {isAdmin && account && (
        <Card className="gap-2">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Authentication Provider
                </p>
                <p className="font-medium capitalize">{account.providerId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Account Created
                </p>
                <p className="font-medium">
                  {await formatDate(new Date(account.createdAt))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Last Updated
                </p>
                <p className="font-medium">
                  {await formatDate(new Date(account.updatedAt))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Tickets */}
      <Card className="gap-2">
        <CardHeader>
          <CardTitle>
            {isAdmin ? "Recent Tickets" : "Assigned Tickets"} (
            {serializedTickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {serializedTickets.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No tickets found for this user
            </p>
          ) : (
            <div className="space-y-3">
              {ticketsWithDates.slice(0, 10).map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/admin/tickets/${ticket.id}`}
                  className="block p-4 border border-border rounded-lg hover:border-foreground/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground truncate">
                          {ticket.title}
                        </h3>
                        <Badge
                          variant={getStatusBadge(ticket.status).variant}
                          className={getStatusBadge(ticket.status).className}
                        >
                          {ticket.status}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-foreground dark:text-foreground"
                        >
                          {ticket.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {ticket.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>#{ticket.ticketNumber}</span>
                        {ticket.formattedCreatedAt && (
                          <span>{ticket.formattedCreatedAt}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions - Admin Only */}
      {isAdmin && (
        <Card className="gap-2">
          <CardHeader>
            <CardTitle>Recent Sessions (Last 10)</CardTitle>
          </CardHeader>
          <CardContent>
            {serializedSessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No sessions found
              </p>
            ) : (
              <div className="space-y-3">
                {sessionsWithDates.map((session) => {
                  const { browser, os, device } = parseUserAgent(
                    session.userAgent
                  );
                  const isActive = new Date(session.expiresAt) > new Date();

                  return (
                    <div
                      key={session.id}
                      className="p-4 border border-border rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {browser} on {os}
                            </span>
                            {isActive ? (
                              <Badge
                                variant="default"
                                className="gap-1 text-white dark:text-white"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Active
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="gap-1 text-foreground dark:text-foreground"
                              >
                                <XCircle className="h-3 w-3" />
                                Expired
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground mb-1">
                                Device Type
                              </p>
                              <p className="font-medium">{device}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">
                                IP Address
                              </p>
                              <p className="font-medium font-mono text-xs">
                                {session.ipAddress}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">
                                Login Time
                              </p>
                              <p className="font-medium">
                                {session.formattedCreatedAt}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">
                                Last Active
                              </p>
                              <p className="font-medium">
                                {session.formattedUpdatedAt}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">
                                Expires At
                              </p>
                              <p className="font-medium">
                                {session.formattedExpiresAt}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-1">
                                Status
                              </p>
                              <p className="font-medium">
                                {isActive ? "Active" : "Expired"}
                              </p>
                            </div>
                          </div>

                          {session.userAgent !== "Unknown" && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <p className="text-xs text-muted-foreground mb-1">
                                User Agent
                              </p>
                              <p className="text-xs font-mono text-muted-foreground break-all">
                                {session.userAgent}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
