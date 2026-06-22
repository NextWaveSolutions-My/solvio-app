import {
  MessageSquare,
  XCircle,
  TrendingUp,
  ThumbsUp,
  Globe2,
} from "lucide-react";
import { StatsGrid } from "@/components/shared/stats-grid";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  getChatbotAnalytics,
  getUnansweredQuestions,
  getRecentChatLogs,
  getDomainAccuracyStats,
} from "@/actions/ai-chat";

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString();
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

export async function ChatLogsPanel() {
  const [analyticsResult, unansweredResult, recentResult, domainResult] =
    await Promise.all([
      getChatbotAnalytics(),
      getUnansweredQuestions(15),
      getRecentChatLogs(30),
      getDomainAccuracyStats(20),
    ]);

  if (!analyticsResult.success || !analyticsResult.data) {
    return (
      <p className="text-sm text-destructive">
        {analyticsResult.error ?? "Failed to load chat analytics"}
      </p>
    );
  }

  const a = analyticsResult.data;
  const stats = [
    {
      title: "Total Conversations",
      value: a.total,
      icon: MessageSquare,
      iconColor: "text-info",
      iconBgColor: "bg-info/15",
      description: `${a.last24h} in last 24h`,
    },
    {
      title: "Match Rate",
      value: `${a.matchRate}%`,
      icon: TrendingUp,
      iconColor: "text-primary",
      iconBgColor: "bg-primary/15",
      description: `${a.matched} answered`,
    },
    {
      title: "Feedback Accuracy",
      value: formatPercent(a.feedbackAccuracy),
      icon: ThumbsUp,
      iconColor: "text-success",
      iconBgColor: "bg-success/15",
      description:
        a.feedbackTotal === 0
          ? "No rated answers yet"
          : `${a.positiveFeedback}/${a.feedbackTotal} helpful`,
    },
    {
      title: "Escalated",
      value: a.escalated,
      icon: XCircle,
      iconColor: "text-destructive",
      iconBgColor: "bg-destructive/15",
      description: `${a.unmatched} not answered · handoff requested`,
    },
  ];

  const unanswered = unansweredResult.success ? unansweredResult.data ?? [] : [];
  const recent = recentResult.success ? recentResult.data ?? [] : [];
  const domains = domainResult.success ? domainResult.data ?? [] : [];

  return (
    <div className="space-y-6">
      <StatsGrid stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe2 className="h-4 w-4" />
            Domain Response Accuracy
          </CardTitle>
          <CardDescription>
            Match rate plus customer feedback, grouped by the resolved site and
            host origin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Domain accuracy appears once visitors use the widget.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site / Domain</TableHead>
                  <TableHead className="w-24 text-right">Chats</TableHead>
                  <TableHead className="w-28 text-right">Match</TableHead>
                  <TableHead className="w-32 text-right">Accuracy</TableHead>
                  <TableHead className="w-28 text-right">Escalated</TableHead>
                  <TableHead className="w-44">Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((d) => (
                  <TableRow key={d.key}>
                    <TableCell className="max-w-md">
                      <p className="truncate text-sm font-medium">
                        {d.siteName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.host ?? "No host recorded"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {d.total}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {d.matchRate}%
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatPercent(d.feedbackAccuracy)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {d.escalated}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(d.lastSeen)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Unanswered Questions</CardTitle>
          <CardDescription>
            Questions visitors asked that did not match any trained pair. Use
            these to grow your knowledge base.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unanswered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing here yet — unanswered questions will appear once visitors
              start chatting.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead className="w-20 text-right">Count</TableHead>
                  <TableHead className="w-44">Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unanswered.map((u, i) => (
                  <TableRow key={i}>
                    <TableCell className="max-w-md truncate text-sm">
                      {u.question}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {u.count}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(u.lastSeen)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Conversations</CardTitle>
          <CardDescription>
            The latest 30 chatbot interactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No chat logs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead className="w-40">Domain</TableHead>
                  <TableHead className="w-40">Outcome</TableHead>
                  <TableHead className="w-28">Feedback</TableHead>
                  <TableHead className="w-20 text-right">Steps</TableHead>
                  <TableHead className="w-44">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell className="max-w-md truncate text-sm">
                      {r.question}
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-xs text-muted-foreground">
                      {r.host ?? (r.siteId ? "Site-scoped" : "Global / app")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          r.outcome === "escalated_ticket"
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : r.outcome === "no_answer"
                              ? "border-muted-foreground/30 bg-muted text-muted-foreground"
                              : "border-success/40 bg-success/10 text-success"
                        }
                      >
                        {r.outcome.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.feedback ? (
                        <Badge
                          variant="outline"
                          className={
                            r.feedback === "up"
                              ? "border-success/40 bg-success/10 text-success"
                              : "border-destructive/40 bg-destructive/10 text-destructive"
                          }
                        >
                          {r.feedback === "up" ? "Helpful" : "Not helpful"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {r.iterations ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(r.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
