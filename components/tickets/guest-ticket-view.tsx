"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/tickets/status-badge";
import {
  Loader2,
  LifeBuoy,
  AlertCircle,
  Send,
  MessageSquare,
} from "lucide-react";
import {
  addGuestTicketComment,
  getGuestTicketByToken,
  type GuestTicketView as GuestTicketData,
  type GuestTicketComment,
} from "@/actions/public-tickets";
import type { TicketStatus } from "@/types";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function GuestTicketView({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<GuestTicketData | null>(null);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const result = await getGuestTicketByToken(token);
      if (!active) return;
      if (result.success && result.data) {
        setTicket(result.data);
      } else {
        setError(result.error || "This ticket link is invalid or has expired.");
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.comments.length]);

  const handleSend = async () => {
    const content = reply.trim();
    if (!content) return;
    setIsSending(true);
    const result = await addGuestTicketComment(token, { content });
    if (result.success && result.data) {
      setTicket((prev) =>
        prev
          ? { ...prev, comments: [...prev.comments, result.data as GuestTicketComment] }
          : prev
      );
      setReply("");
      toast.success("Reply sent");
    } else {
      toast.error(result.error || "Failed to send your reply");
    }
    setIsSending(false);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="container mx-auto flex max-w-3xl items-center justify-center px-4 py-24 sm:px-6 lg:px-0">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Invalid / expired token ──────────────────────────────────────────────────
  if (error || !ticket) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-24 sm:px-6 lg:px-0">
        <div className="rounded-2xl border border-border/60 bg-background p-8 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Ticket not found
          </h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="outline" className="h-11">
              <Link href="/support/new">Create a new ticket</Link>
            </Button>
            <Button asChild className="h-11">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isClosed = ["resolved", "closed"].includes(
    ticket.status.replace(/-/g, "_")
  );

  // ── Ticket view ──────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-0">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
        <LifeBuoy className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
          Your Ticket
        </span>
      </div>

      {/* Header card */}
      <div className="rounded-2xl border border-border/60 bg-background p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-sm text-muted-foreground">
              {ticket.ticketNumber}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {ticket.title}
            </h1>
          </div>
          <StatusBadge status={ticket.status as TicketStatus} />
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {ticket.description}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Opened {formatDate(ticket.createdAt)}
          {ticket.guestName ? ` by ${ticket.guestName}` : ""}
        </p>
      </div>

      {/* Conversation */}
      <div className="mt-6 rounded-2xl border border-border/60 bg-background p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <MessageSquare className="h-4.5 w-4.5 text-muted-foreground" />
          Conversation
        </h2>

        {ticket.comments.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No replies yet. Our team will respond here, and you&apos;ll get an
            email when they do.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {ticket.comments.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "flex flex-col",
                  c.fromGuest ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    c.fromGuest
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap">{c.content}</p>
                </div>
                <span className="mt-1 px-1 text-[11px] text-muted-foreground">
                  {c.authorName} · {formatDate(c.createdAt)}
                </span>
              </div>
            ))}
            <div ref={threadEndRef} />
          </div>
        )}
      </div>

      {/* Reply box */}
      <div className="mt-6 rounded-2xl border border-border/60 bg-background p-6 shadow-sm">
        {isClosed ? (
          <p className="text-sm text-muted-foreground">
            This ticket is {ticket.status.replace(/-/g, "_") === "resolved" ? "resolved" : "closed"}.
            If you still need help,{" "}
            <Link
              href="/support/new"
              className="font-medium text-primary hover:underline"
            >
              create a new ticket
            </Link>
            .
          </p>
        ) : (
          <>
            <h2 className="mb-3 text-lg font-semibold">Add a reply</h2>
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your message..."
              disabled={isSending}
              className="min-h-[120px] resize-none placeholder:text-muted-foreground/50"
            />
            <div className="mt-3 flex justify-end">
              <Button
                onClick={handleSend}
                disabled={isSending || !reply.trim()}
                className="h-11"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Reply
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
