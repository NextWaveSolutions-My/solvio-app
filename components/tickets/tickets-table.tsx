"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Ticket } from "@/types";
import { StatusBadge } from "./status-badge";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "./priority-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TicketBulkActions } from "./ticket-bulk-actions";
import { MoreHorizontal, ExternalLink } from "lucide-react";
import { useTableSelection } from "@/hooks/use-table-selection";
import { useDataTablePagination } from "@/hooks/use-data-table-pagination";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DataTableBulkActions } from "@/components/ui/data-table-bulk-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TicketsTableProps {
  tickets: Ticket[];
  hrefBase?: string;
  getHref?: (ticket: Ticket) => string;
}

const categoryLabels: Record<string, string> = {
  bug: "Bug Report",
  feature_request: "Feature Request",
  technical_support: "Technical Support",
  account: "Account Issue",
  general: "General Inquiry",
};

export function TicketsTable({
  tickets,
  hrefBase = "/dashboard/tickets",
  getHref,
}: TicketsTableProps) {
  const {
    page,
    pageSize,
    pageSizeOptions,
    paginatedItems: paginatedTickets,
    startItem,
    endItem,
    totalItems,
    goToPage,
    updatePageSize,
  } = useDataTablePagination(tickets);
  const selection = useTableSelection(tickets, (ticket) =>
    ticket._id.toString(),
  );
  // Bulk actions are staff-only. Customer dashboard tables use a "/dashboard"
  // hrefBase and never get them.
  const enableBulkActions =
    hrefBase.startsWith("/admin") || hrefBase.startsWith("/support-agent");

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No tickets found
      </div>
    );
  }

  return (
    <>
      {enableBulkActions && (
        <DataTableBulkActions
          selectedCount={selection.selectedCount}
          itemLabel="ticket"
          onClear={selection.clear}
        >
          <TicketBulkActions
            selectedIds={selection.selectedIdList}
            onDone={selection.clear}
          />
        </DataTableBulkActions>
      )}
      <div className="rounded-lg overflow-hidden border border-border bg-card/50 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/20 hover:bg-muted/20">
              {enableBulkActions && (
                <TableHead className="h-12 px-4 w-[50px]">
                  <Checkbox
                    aria-label="Select all"
                    checked={selection.headerCheckedState}
                    onCheckedChange={() => selection.toggleAll()}
                    className="border-border/60"
                  />
                </TableHead>
              )}
              <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                Ticket
              </TableHead>
              <TableHead className="hidden xl:table-cell h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                Product
              </TableHead>
              <TableHead className="hidden lg:table-cell h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                Category
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                Priority
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                Status
              </TableHead>
              <TableHead className="hidden md:table-cell h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                Last Updated
              </TableHead>
              <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider w-[100px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-background/50">
            {paginatedTickets.map((ticket) => (
              <TableRow
                key={ticket._id.toString()}
                data-state={
                  enableBulkActions &&
                  selection.isSelected(ticket._id.toString())
                    ? "selected"
                    : undefined
                }
                className={cn(
                  "border-b border-border/30 hover:bg-muted/30 transition-all duration-200 group",
                  enableBulkActions &&
                    selection.isSelected(ticket._id.toString()) &&
                    "bg-primary/5",
                )}
              >
                {enableBulkActions && (
                  <TableCell className="py-3.5 px-4">
                    <Checkbox
                      aria-label={`Select ticket ${ticket.ticketNumber}`}
                      checked={selection.isSelected(ticket._id.toString())}
                      onCheckedChange={() =>
                        selection.toggle(ticket._id.toString())
                      }
                      className="border-border/60"
                    />
                  </TableCell>
                )}
                <TableCell className="py-3.5 px-4">
                  <Link
                    href={
                      getHref
                        ? getHref(ticket)
                        : `${hrefBase}/${ticket._id.toString()}`
                    }
                    className="block"
                  >
                    <div className="min-w-0 max-w-[180px]">
                      <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {ticket.title}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">
                        {ticket.ticketNumber}
                      </p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="hidden xl:table-cell py-3.5 px-4">
                  <span className="text-sm text-foreground/90 block truncate max-w-[120px]">
                    {ticket.productName || "—"}
                  </span>
                </TableCell>
                <TableCell className="hidden lg:table-cell py-3.5 px-4">
                  <span className="text-sm text-foreground/90">
                    {categoryLabels[ticket.category] || ticket.category}
                  </span>
                </TableCell>
                <TableCell className="py-3.5 px-4">
                  <PriorityBadge priority={ticket.priority} />
                </TableCell>
                <TableCell className="py-3.5 px-4">
                  <StatusBadge status={ticket.status} />
                </TableCell>
                <TableCell className="hidden md:table-cell py-3.5 px-4">
                  <span className="text-sm text-muted-foreground/70">
                    {formatDistanceToNow(new Date(ticket.lastActivityAt), {
                      addSuffix: true,
                    })}
                  </span>
                </TableCell>
                <TableCell className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-muted/60 transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem asChild>
                          <Link
                            href={
                              getHref
                                ? getHref(ticket)
                                : `${hrefBase}/${ticket._id.toString()}`
                            }
                            className="cursor-pointer"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <DataTablePagination
          page={page}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          totalItems={totalItems}
          startItem={startItem}
          endItem={endItem}
          onPageChange={goToPage}
          onPageSizeChange={updatePageSize}
        />
      </div>
    </>
  );
}
