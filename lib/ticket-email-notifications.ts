import { ObjectId, type Filter } from "mongodb";

import { getCollection } from "@/lib/db";
import {
  emailTemplates,
  sendEmail,
  shouldSendEmailNotification,
} from "@/lib/email";
import type { Ticket, User } from "@/types";

type EmailUser = User & { _id?: ObjectId };

async function findUserByAnyId(userId: string): Promise<EmailUser | null> {
  const usersCollection = await getCollection<EmailUser>("user");
  const queries: Filter<EmailUser>[] = [{ id: userId }];

  if (ObjectId.isValid(userId)) {
    queries.push({ _id: new ObjectId(userId) });
  }

  return usersCollection.findOne({ $or: queries });
}

export async function sendTicketAssignmentEmail(params: {
  assigneeId: string;
  ticket: Pick<Ticket, "ticketNumber" | "title">;
  ticketUrl?: string;
}) {
  const { enabled } = await shouldSendEmailNotification("ticketAssignment");
  if (!enabled) {
    return { success: true, skipped: true, reason: "disabled" };
  }

  const assignee = await findUserByAnyId(params.assigneeId);
  if (!assignee?.email) {
    return { success: true, skipped: true, reason: "missing_recipient" };
  }

  const emailResult = await sendEmail({
    to: assignee.email,
    ...emailTemplates.ticketAssigned(
      params.ticket.ticketNumber,
      params.ticket.title,
      assignee.name || "Support Team",
      params.ticketUrl
    ),
  });

  if (!emailResult.success) {
    console.error(
      `Failed to send assignment email to ${assignee.email}:`,
      emailResult.error
    );
  }

  return emailResult;
}

export async function sendAdminNewTicketEmails(params: {
  ticket: Pick<
    Ticket,
    | "ticketNumber"
    | "title"
    | "description"
    | "priority"
    | "category"
    | "productName"
    | "productVersion"
    | "purchaseCode"
    | "createdAt"
  >;
  customerName: string;
  customerEmail: string;
  customerCountry?: string;
  ticketUrl: string;
}) {
  const { enabled, settings } = await shouldSendEmailNotification("newTicket");
  if (!enabled) {
    return { success: true, skipped: true, reason: "disabled" };
  }

  const recipients = new Set<string>();
  const configuredAdminEmail = settings.email?.adminNotificationEmail?.trim();
  if (configuredAdminEmail && configuredAdminEmail !== "admin@example.com") {
    recipients.add(configuredAdminEmail);
  }

  const usersCollection = await getCollection<EmailUser>("user");
  const adminUsers = await usersCollection
    .find({ role: "admin" } as Filter<EmailUser>)
    .project<Pick<EmailUser, "email">>({ email: 1 })
    .toArray();

  for (const admin of adminUsers) {
    if (admin.email) recipients.add(admin.email);
  }

  if (recipients.size === 0) {
    return { success: true, skipped: true, reason: "missing_recipient" };
  }

  const createdAt =
    params.ticket.createdAt instanceof Date
      ? params.ticket.createdAt
      : new Date(params.ticket.createdAt);
  const createdAtFormatted = createdAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const template = emailTemplates.adminNewTicketNotification(
    params.ticket.ticketNumber,
    params.ticket.title,
    params.ticket.description,
    params.customerName,
    params.customerEmail,
    params.customerCountry,
    params.ticket.priority,
    params.ticket.category,
    params.ticket.productName,
    params.ticket.productVersion,
    params.ticket.purchaseCode,
    createdAtFormatted,
    params.ticketUrl
  );

  const results = await Promise.allSettled(
    Array.from(recipients).map((to) => sendEmail({ to, ...template }))
  );
  const failed = results.filter(
    (result) =>
      result.status === "rejected" ||
      (result.status === "fulfilled" && !result.value.success)
  );

  if (failed.length > 0) {
    console.error("Failed to send one or more admin new-ticket emails:", failed);
  }

  return {
    success: failed.length === 0,
    sent: results.length - failed.length,
    failed: failed.length,
  };
}
