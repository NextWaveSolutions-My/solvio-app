"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  getContactSubmissions,
  updateContactStatus,
  deleteContactSubmission,
  ContactSubmission,
} from "@/actions/contact";
import { useFormatDate } from "@/components/providers/settings-provider";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PageTabsHeader } from "@/components/shared/page-tabs-header";
import { EmptySearchResults } from "@/components/shared/empty-search-results";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useDataTablePagination } from "@/hooks/use-data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail,
  Calendar,
  Eye,
  Trash2,
  User,
  FileText,
  MessageSquare,
  Loader2,
} from "lucide-react";

type ContactStatus = ContactSubmission["status"];

const CONTACT_STATUSES: Array<{ value: ContactStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
  { value: "archived", label: "Archived" },
];

const CONTACT_TAB_VALUES = ["all", "new", "read", "replied", "archived"] as const;

const CONTACT_STATUS_STYLES: Record<ContactStatus, string> = {
  new: "bg-blue-500 text-white",
  read: "bg-yellow-500 text-black",
  replied: "bg-green-500 text-white",
  archived: "bg-gray-500 text-white",
};

function ContactSubmissionsTable({
  submissions,
  onStatusChange,
  onOpenDetail,
  onDelete,
  formatDate,
}: {
  submissions: ContactSubmission[];
  onStatusChange: (id: string, status: ContactStatus) => void;
  onOpenDetail: (submission: ContactSubmission) => void;
  onDelete: (id: string) => void;
  formatDate: (date: string | Date | null | undefined) => string;
}) {
  const {
    page,
    pageSize,
    pageSizeOptions,
    paginatedItems,
    startItem,
    endItem,
    totalItems,
    goToPage,
    updatePageSize,
  } = useDataTablePagination(submissions);

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No contact submissions found
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/50 backdrop-blur-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border bg-muted/20 hover:bg-muted/20">
            <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
              Name
            </TableHead>
            <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
              Email
            </TableHead>
            <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
              Subject
            </TableHead>
            <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
              Status
            </TableHead>
            <TableHead className="h-12 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
              Date
            </TableHead>
            <TableHead className="h-12 w-[120px] px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="bg-background/50">
          {paginatedItems.map((submission) => (
            <TableRow
              key={submission._id}
              className="group border-b border-border/30 transition-all duration-200 hover:bg-muted/30"
            >
              <TableCell className="px-4 py-3.5 font-medium">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {submission.name}
                </div>
              </TableCell>
              <TableCell className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${submission.email}`}
                    className="truncate text-foreground/90 hover:underline"
                  >
                    {submission.email}
                  </a>
                </div>
              </TableCell>
              <TableCell className="max-w-[300px] px-4 py-3.5">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-foreground/90">
                    {submission.subject}
                  </span>
                </div>
              </TableCell>
              <TableCell className="px-4 py-3.5">
                  <Select
                  value={submission.status}
                  onValueChange={(value) =>
                    onStatusChange(submission._id!, value as ContactStatus)
                  }
                >
                  <SelectTrigger className="h-9 w-[130px] border-border/70 bg-background/80">
                    <SelectValue>
                      <Badge className={CONTACT_STATUS_STYLES[submission.status]}>
                        {CONTACT_STATUSES.find((s) => s.value === submission.status)?.label}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <Badge className={CONTACT_STATUS_STYLES[status.value]}>
                          {status.label}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="px-4 py-3.5">
                <div className="flex items-center gap-2 text-muted-foreground/80">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">{formatDate(submission.createdAt)}</span>
                </div>
              </TableCell>
              <TableCell className="px-4 py-3.5">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onOpenDetail(submission)}
                    className="h-8 w-8 transition-colors hover:bg-muted/60"
                  >
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(submission._id!)}
                    className="h-8 w-8 text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
        resultsLabel="messages"
      />
    </div>
  );
}

export default function ContactPage() {
  const formatDate = useFormatDate();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] =
    useState<ContactSubmission | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const requestedTab = searchParams.get("status");
  const activeTab =
    requestedTab && CONTACT_TAB_VALUES.includes(requestedTab as (typeof CONTACT_TAB_VALUES)[number])
      ? requestedTab
      : "all";
  const searchValue = searchParams.get("search") || "";

  useEffect(() => {
    loadSubmissions();
  }, []);

  const updateQueryParam = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      const data = await getContactSubmissions();
      setSubmissions(data);
    } catch {
      toast.error("Failed to load submissions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: ContactStatus) => {
    const result = await updateContactStatus(id, status);
    if (result.success) {
      toast.success(result.message);
      loadSubmissions();
    } else {
      toast.error(result.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;

    const result = await deleteContactSubmission(id);
    if (result.success) {
      toast.success(result.message);
      loadSubmissions();
    } else {
      toast.error(result.message);
    }
  };

  const openDetail = (submission: ContactSubmission) => {
    setSelectedSubmission(submission);
    setIsDetailOpen(true);
    if (submission.status === "new") {
      handleStatusChange(submission._id!, "read");
    }
  };

  const getStatusBadge = (status: ContactStatus) => {
    return (
      <Badge className={CONTACT_STATUS_STYLES[status]}>
        {CONTACT_STATUSES.find((item) => item.value === status)?.label ?? status}
      </Badge>
    );
  };

  const searchedSubmissions = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return submissions;

    return submissions.filter((submission) => {
      return (
        submission.name.toLowerCase().includes(query) ||
        submission.email.toLowerCase().includes(query) ||
        submission.subject.toLowerCase().includes(query) ||
        submission.message.toLowerCase().includes(query)
      );
    });
  }, [submissions, searchValue]);

  const newSubmissions = searchedSubmissions.filter((s) => s.status === "new");
  const readSubmissions = searchedSubmissions.filter((s) => s.status === "read");
  const repliedSubmissions = searchedSubmissions.filter(
    (s) => s.status === "replied"
  );
  const archivedSubmissions = searchedSubmissions.filter(
    (s) => s.status === "archived"
  );

  const tabItems = [
    { value: "all", label: "All", count: searchedSubmissions.length },
    { value: "new", label: "New", count: newSubmissions.length },
    { value: "read", label: "Read", count: readSubmissions.length },
    { value: "replied", label: "Replied", count: repliedSubmissions.length },
    { value: "archived", label: "Archived", count: archivedSubmissions.length },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Contact Submissions</h1>
        <p className="mt-2 text-muted-foreground">
          Review and manage incoming contact form messages
        </p>
      </div>

      <Card className="border-border p-4 shadow-none">
        <Tabs value={activeTab} onValueChange={(value) => updateQueryParam("status", value)}>
          <PageTabsHeader
            tabs={tabItems}
            showSearch
            searchPlaceholder="Search messages..."
            searchDefaultValue={searchValue}
          />

          <TabsContent value="all">
            {searchedSubmissions.length === 0 ? (
              <EmptySearchResults
                searchQuery={searchValue}
                entityName="contact submissions"
              />
            ) : (
              <ContactSubmissionsTable
                submissions={searchedSubmissions}
                onStatusChange={handleStatusChange}
                onOpenDetail={openDetail}
                onDelete={handleDelete}
                formatDate={formatDate}
              />
            )}
          </TabsContent>

          <TabsContent value="new">
            <ContactSubmissionsTable
              submissions={newSubmissions}
              onStatusChange={handleStatusChange}
              onOpenDetail={openDetail}
              onDelete={handleDelete}
              formatDate={formatDate}
            />
          </TabsContent>

          <TabsContent value="read">
            <ContactSubmissionsTable
              submissions={readSubmissions}
              onStatusChange={handleStatusChange}
              onOpenDetail={openDetail}
              onDelete={handleDelete}
              formatDate={formatDate}
            />
          </TabsContent>

          <TabsContent value="replied">
            <ContactSubmissionsTable
              submissions={repliedSubmissions}
              onStatusChange={handleStatusChange}
              onOpenDetail={openDetail}
              onDelete={handleDelete}
              formatDate={formatDate}
            />
          </TabsContent>

          <TabsContent value="archived">
            <ContactSubmissionsTable
              submissions={archivedSubmissions}
              onStatusChange={handleStatusChange}
              onOpenDetail={openDetail}
              onDelete={handleDelete}
              formatDate={formatDate}
            />
          </TabsContent>
        </Tabs>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Contact Message Details
            </DialogTitle>
            <DialogDescription>
              Submitted on {selectedSubmission && formatDate(selectedSubmission.createdAt)}
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">From</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{selectedSubmission.name}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <a
                      href={`mailto:${selectedSubmission.email}`}
                      className="hover:underline"
                    >
                      {selectedSubmission.email}
                    </a>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Subject</p>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{selectedSubmission.subject}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Message</p>
                <div className="rounded-lg bg-muted/30 p-4">
                  <p className="whitespace-pre-wrap">{selectedSubmission.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Status:</p>
                {getStatusBadge(selectedSubmission.status)}
              </div>
              <div className="flex gap-2 pt-4">
                <a
                  href={`mailto:${selectedSubmission.email}?subject=Re: ${selectedSubmission.subject}`}
                >
                  <Button className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Reply via Email
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
