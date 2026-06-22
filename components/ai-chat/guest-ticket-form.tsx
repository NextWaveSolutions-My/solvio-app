"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface GuestTicketFormProps {
  visitorId: string;
  chatLogId?: string;
  defaultMessage?: string;
  /** Department the agent inferred from the chat, used to route the ticket. */
  departmentSlug?: string;
  onSubmitted: (ticketNumber: string) => void;
  onCancel: () => void;
}

export function GuestTicketForm({
  visitorId,
  chatLogId,
  defaultMessage = "",
  departmentSlug,
  onSubmitted,
  onCancel,
}: GuestTicketFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState(defaultMessage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !name.trim() ||
      !email.trim() ||
      subject.trim().length < 3 ||
      message.trim().length < 5
    ) {
      setError(
        "Please fill in all fields (subject ≥ 3 chars, message ≥ 5 chars)."
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/chat/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          visitorId,
          chatLogId,
          departmentSlug,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Failed to submit ticket");
        return;
      }
      onSubmitted(data.data.ticketNumber);
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
    >
      <p className="text-xs font-medium text-muted-foreground">
        Talk to a human — we&apos;ll get back to you by email.
      </p>

      <div className="space-y-1">
        <Label htmlFor="guest-name" className="text-[11px]">
          Your name
        </Label>
        <Input
          id="guest-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-sm"
          placeholder="Jane Doe"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="guest-email" className="text-[11px]">
          Email
        </Label>
        <Input
          id="guest-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-8 text-sm"
          placeholder="jane@example.com"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="guest-subject" className="text-[11px]">
          Subject
        </Label>
        <Input
          id="guest-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="h-8 text-sm"
          placeholder="Brief summary of your issue"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="guest-message" className="text-[11px]">
          Message
        </Label>
        <Textarea
          id="guest-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="resize-none text-sm"
          placeholder="How can we help?"
          disabled={isLoading}
        />
      </div>

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          className="flex-1"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="mr-1.5 h-3.5 w-3.5" />
          )}
          Send
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
