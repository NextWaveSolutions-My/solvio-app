import { getNewsletterSubscribers } from "@/actions/newsletter";
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
import { formatDate } from "@/lib/settings-utils";
import { Mail, Calendar, CheckCircle, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewsletterPage() {
  const subscribers = await getNewsletterSubscribers();
  const subscribersWithFormattedDate = await Promise.all(
    subscribers.map(async (subscriber) => ({
      ...subscriber,
      formattedSubscribedAt: await formatDate(subscriber.subscribedAt),
    })),
  );

  return (
    <div className="flex-1 space-y-4 p-0 sm:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Newsletter</h2>
      </div>
      <Card className="gap-2">
        <CardHeader>
          <CardTitle>Subscribers</CardTitle>
          <CardDescription>
            Manage your newsletter subscribers ({subscribers.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/60">
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscribed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribersWithFormattedDate.map((subscriber) => (
                <TableRow key={subscriber._id} className="border-border/40">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {subscriber.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {subscriber.status === "subscribed" ? (
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-4 w-4" />
                        <span className="capitalize">{subscriber.status}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-destructive">
                        <XCircle className="h-4 w-4" />
                        <span className="capitalize">{subscriber.status}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {subscriber.formattedSubscribedAt}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {subscribers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No subscribers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
