import Link from "next/link";
import type { Ticket } from "@/types";
import { StatusBadge } from "./status-badge";
import { formatDistanceToNow } from "date-fns";
import { PriorityBadge } from "./priority-badge";
import { MessageSquare, Clock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface TicketCardProps {
  ticket: Ticket;
  showCustomer?: boolean;
  hrefBase?: string;
  getHref?: (ticket: Ticket) => string;
}

export function TicketCard({
  ticket,
  showCustomer = false,
  hrefBase = "/dashboard/tickets",
  getHref,
}: TicketCardProps) {
  const href = getHref ? getHref(ticket) : `${hrefBase}/${ticket?._id?.toString()}`;
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer gap-2">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-mono text-muted-foreground">
                  {ticket?.ticketNumber}
                </span>
                <StatusBadge status={ticket?.status} />
                <PriorityBadge priority={ticket?.priority} />
              </div>
              <h3 className="font-semibold text-lg truncate">{ticket?.title}</h3>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {ticket?.description}
          </p>

          <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {ticket?.createdAt && formatDistanceToNow(new Date(ticket.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              {ticket?.category && (
                <span className="px-2 py-0.5 bg-muted rounded-full text-xs">
                  {ticket?.category?.replace("_", " ")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 sm:justify-end">
              <MessageSquare className="h-3 w-3" />
              <span>0</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
