"use server";

import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-utils";
import { createCommentSchema } from "@/lib/validations";
import { findRequestById, getRequestPaths } from "@/lib/request-utils";
import { createNotification } from "@/lib/notifications";
import {
  emitCommentCreated,
  emitCommentDeleted,
  emitCommentUpdated,
} from "@/lib/socket/server";
import { getUserIdsByRole } from "@/lib/user-utils";
import { notifyAdminsTelegram, toPlainPreview } from "@/lib/telegram/server";
import type { ApiResponse, Attachment, Comment, CommentFormData, Ticket } from "@/types";
type SerializedComment = Omit<Comment, "_id" | "createdAt" | "updatedAt"> & {
  _id: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Add a comment to a ticket
 */
export async function addComment(
  ticketId: string,
  data: CommentFormData
): Promise<ApiResponse<Comment>> {
  try {
    // Validate authentication
    const session = await requireAuth();
    const userId = session.user.id;
    const userRole = session.user.role as "admin" | "support" | "customer";

    // Validate input
    const validatedData = createCommentSchema.parse(data);

    // Check if ticket/request exists and user has access
    const { request, kind, collectionName } = await findRequestById(ticketId);

    if (!request || !kind || !collectionName) {
      return {
        success: false,
        error: "Ticket not found",
      };
    }

    const ticket = request as Ticket;

    // Check permissions
    if (userRole === "customer" && ticket.customerId !== userId) {
      return {
        success: false,
        error: "You don't have permission to comment on this ticket",
      };
    }

    // Only support/admin can create internal notes
    if (validatedData.isInternal && userRole === "customer") {
      return {
        success: false,
        error: "You don't have permission to create internal notes",
      };
    }

    // If replying to a comment, verify parent exists
    if (validatedData.parentCommentId) {
      const commentsCollection = await getCollection<Comment>("comments");
      const parentComment = await commentsCollection.findOne({
        _id: new ObjectId(validatedData.parentCommentId),
        ticketId,
      });

      if (!parentComment) {
        return {
          success: false,
          error: "Parent comment not found",
        };
      }
    }

    // Create comment object
    const now = new Date();
    const comment: Omit<Comment, "_id"> = {
      ticketId,
      userId,
      content: validatedData.content,
      isInternal: validatedData.isInternal || false,
      parentCommentId: validatedData.parentCommentId,
      attachments: validatedData.attachmentIds,
      createdAt: now,
      updatedAt: now,
    };

    // Insert into database
    const commentsCollection = await getCollection<Comment>("comments");
    const result = await commentsCollection.insertOne(comment as Comment);

    // Link uploaded attachments to this comment
    if (validatedData.attachmentIds && validatedData.attachmentIds.length > 0) {
      const attachmentsCollection = await getCollection<Attachment>("attachments");
      const attachmentObjectIds = validatedData.attachmentIds
        .filter((aid) => ObjectId.isValid(aid))
        .map((aid) => new ObjectId(aid));
      if (attachmentObjectIds.length > 0) {
        await attachmentsCollection.updateMany(
          {
            _id: { $in: attachmentObjectIds },
            ticketId: new ObjectId(ticketId),
            userId,
          },
          { $set: { commentId: result.insertedId.toString() } }
        );
      }
    }

    // Update ticket/request lastActivityAt in the correct collection
    const ticketsCollection = await getCollection(collectionName);
    await ticketsCollection.updateOne(
      { _id: new ObjectId(ticketId) },
      { $set: { lastActivityAt: now } }
    );

    // Create history entry
    const historyCollection = await getCollection("ticket_history");
    await historyCollection.insertOne({
      ticketId: new ObjectId(ticketId),
      requestType: kind,
      userId,
      action: "comment_added",
      metadata: { commentId: result.insertedId.toString() },
      createdAt: now,
    });

    // Revalidate relevant dashboard/admin paths based on request kind
    const paths = getRequestPaths(
      ticketId,
      kind,
      kind === "service" ? (ticket as Ticket).serviceSlug : undefined
    );
    revalidatePath(paths.dashboardDetail);
    revalidatePath(paths.dashboardList);
    revalidatePath(paths.adminDetail);
    revalidatePath(paths.adminList);

    const usersCollection = await getCollection("user");
    const canonicalUserId = async (rawId: string) => {
      const byId = await usersCollection.findOne({ id: rawId });
      if (byId?.id) return byId.id;
      if (ObjectId.isValid(rawId)) {
        const byObjectId = await usersCollection.findOne({
          _id: new ObjectId(rawId),
        });
        if (byObjectId?.id) return byObjectId.id;
      }
      return rawId;
    };

    if (!validatedData.isInternal) {
      const { dispatchUserNotification } = await import("@/lib/notifications");
      const { emailTemplates, shouldSendEmailNotification, sendEmail } =
        await import("@/lib/email");
      const { enabled: sendCommentEmail } =
        await shouldSendEmailNotification("newComment");
      const buildCommentEmail = (commenterName: string) =>
        sendCommentEmail
          ? {
              subject: `New Comment on Ticket ${ticket.ticketNumber}`,
              html: emailTemplates.newComment(
                ticket.ticketNumber,
                ticket.title,
                commenterName,
                validatedData.content
              ).html,
            }
          : undefined;

      if (userRole !== "customer") {
        const titlePrefix =
          kind === "installation"
            ? "Installation Request"
            : kind === "customization"
            ? "Customization Request"
            : "Ticket";

        const guestTicket = ticket as Ticket;
        if (guestTicket.isGuest) {
          // Guests have no account/inbox — email them the reply with a link to
          // the public portal so they can read it and respond.
          if (sendCommentEmail && guestTicket.guestEmail) {
            const portalBase =
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            const viewUrl = guestTicket.guestAccessToken
              ? `${portalBase}/support/ticket/${guestTicket.guestAccessToken}`
              : undefined;
            await sendEmail({
              to: guestTicket.guestEmail,
              ...emailTemplates.newComment(
                ticket.ticketNumber,
                ticket.title,
                session.user.name || "Support",
                validatedData.content,
                viewUrl
              ),
            });
          }
        } else {
          const customerRecipientId = await canonicalUserId(ticket.customerId);
          await dispatchUserNotification({
            userId: customerRecipientId,
            type: "comment",
            title: `New Comment on ${titlePrefix}`,
            body: `${session.user.name} replied: ${validatedData.content}`,
            data: {
              ticketId,
              ticketNumber: ticket.ticketNumber,
              commentId: result.insertedId.toString(),
              url: paths.dashboardDetail,
              ...(kind === "installation" && { installationId: ticketId }),
              ...(kind === "customization" && { customizationId: ticketId }),
            },
            email: buildCommentEmail(session.user.name || "Support"),
            forceInApp: true,
          });
          if (customerRecipientId !== ticket.customerId) {
            await createNotification({
              userId: ticket.customerId,
              type: "comment",
              title: `New Comment on ${titlePrefix}`,
              body: `${session.user.name} replied: ${validatedData.content}`,
              data: {
                ticketId,
                ticketNumber: ticket.ticketNumber,
                commentId: result.insertedId.toString(),
                url: paths.dashboardDetail,
                ...(kind === "installation" && { installationId: ticketId }),
                ...(kind === "customization" && { customizationId: ticketId }),
              },
            });
          }
        }
      } else {
        const assignedIdRaw = (ticket as Ticket).assignedToId as string | null;
        const assignedId = assignedIdRaw
          ? await canonicalUserId(assignedIdRaw)
          : null;
        const titlePrefix =
          kind === "installation"
            ? "Installation Request"
            : kind === "customization"
            ? "Customization Request"
            : "Ticket";

        // A customer reply should always reach every admin so it shows in the
        // admin panel, plus the assigned support agent (if any). Collect the
        // recipients with the panel URL that matches their role, de-duplicated
        // so nobody is notified twice.
        const recipients: { userId: string; url: string }[] = [];
        const seenRecipients = new Set<string>();
        const addRecipient = (id: string | null | undefined, url: string) => {
          // Skip the actor: a customer who also holds the admin/assignee role
          // should not be notified about their own comment.
          if (!id || id === userId || seenRecipients.has(id)) return;
          seenRecipients.add(id);
          recipients.push({ userId: id, url });
        };

        const adminIds = await getUserIdsByRole(["admin"]);
        const adminDocs = await usersCollection
          .find({ role: { $in: ["admin"] } })
          .toArray();
        const legacyAdminIds = adminDocs
          .map((u: { _id?: ObjectId }) => u?._id?.toString?.())
          .filter(Boolean) as string[];
        for (const id of [...(adminIds || []), ...legacyAdminIds]) {
          addRecipient(id, paths.adminDetail);
        }

        addRecipient(assignedId, paths.supportDetail);
        addRecipient(assignedIdRaw, paths.supportDetail);

        for (const recipient of recipients) {
          await dispatchUserNotification({
            userId: recipient.userId,
            type: "comment",
            title: "New Comment from Customer",
            body: `${
              session.user.name
            } commented on ${titlePrefix.toLowerCase()} #${
              ticket.ticketNumber
            }: ${ticket.title}`,
            data: {
              ticketId,
              ticketNumber: ticket.ticketNumber,
              commentId: result.insertedId.toString(),
              url: recipient.url,
              ...(kind === "installation" && { installationId: ticketId }),
              ...(kind === "customization" && { customizationId: ticketId }),
            },
            email: buildCommentEmail(session.user.name || "Customer"),
            forceInApp: true,
          });
        }

        // Mirror the customer reply to the shared admin Telegram group (once,
        // not per recipient) so admins see it without opening the panel. The
        // comment content is rich-text HTML, so strip tags and truncate before
        // including the message itself.
        const commentPreview = toPlainPreview(validatedData.content);
        void notifyAdminsTelegram({
          title: "New Comment from Customer",
          body:
            `${session.user.name} commented on ${titlePrefix.toLowerCase()} #${ticket.ticketNumber}: ${ticket.title}` +
            (commentPreview ? `\n\n${commentPreview}` : ""),
          url: paths.adminDetail,
        });
      }
    }

    // Create serialized comment to return
    const serializedComment: SerializedComment = {
      ...comment,
      _id: result.insertedId.toString(),
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };

    emitCommentCreated(ticketId, serializedComment);

    return {
      success: true,
      data: serializedComment as unknown as Comment,
      message: "Comment added successfully",
    };
  } catch (error: unknown) {
    console.error("Error adding comment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add comment",
    };
  }
}

/**
 * Get all comments for a ticket
 */
export async function getTicketComments(
  ticketId: string
): Promise<ApiResponse<Comment[]>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const userRole = session.user.role as "admin" | "support" | "customer";

    // Check if ticket/request exists and user has access
    const { request } = await findRequestById(ticketId);

    if (!request) {
      return {
        success: false,
        error: "Ticket not found",
      };
    }

    const ticket = request as Ticket;

    // Check permissions
    if (userRole === "customer" && ticket.customerId !== userId) {
      return {
        success: false,
        error: "You don't have permission to view these comments",
      };
    }

    // Get comments
    const commentsCollection = await getCollection<Comment>("comments");
    const query: { ticketId: string; isInternal?: boolean } = { ticketId };

    // Customers can't see internal notes
    if (userRole === "customer") {
      query.isInternal = false;
    }

    const comments = await commentsCollection
      .find(query)
      .sort({ createdAt: 1 })
      .toArray();

    const serializedComments = comments.map((c: Comment) => ({
      ...c,
      _id: c._id?.toString?.() ?? c._id,
      createdAt:
        c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
      updatedAt:
        c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
    }));

    return {
      success: true,
      data: serializedComments as unknown as Comment[],
    };
  } catch (error: unknown) {
    console.error("Error fetching comments:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch comments",
    };
  }
}

/**
 * Delete a comment (admin/support only)
 */
export async function deleteComment(
  commentId: string
): Promise<ApiResponse<void>> {
  try {
    const session = await requireAuth();
    const userRole = session.user.role as "admin" | "support" | "customer";

    // Only admin/support can delete comments
    if (userRole === "customer") {
      return {
        success: false,
        error: "You don't have permission to delete comments",
      };
    }

    const commentsCollection = await getCollection<Comment>("comments");
    const existingComment = await commentsCollection.findOne({
      _id: new ObjectId(commentId),
    });

    if (!existingComment) {
      return {
        success: false,
        error: "Comment not found",
      };
    }

    const result = await commentsCollection.deleteOne({
      _id: new ObjectId(commentId),
    });

    if (result.deletedCount === 0) {
      return {
        success: false,
        error: "Comment not found",
      };
    }

    emitCommentDeleted(existingComment.ticketId, commentId);

    return {
      success: true,
      message: "Comment deleted successfully",
    };
  } catch (error: unknown) {
    console.error("Error deleting comment:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete comment",
    };
  }
}

export async function updateComment(
  ticketId: string,
  commentId: string,
  data: { content: string; expectedUpdatedAt: string }
): Promise<ApiResponse<Comment>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const now = new Date();

    // Validate ticket access
    const { request, kind, collectionName } = await findRequestById(ticketId);
    if (!request || !kind || !collectionName) {
      return { success: false, error: "Ticket not found" };
    }

    // Validate content using existing rules
    const validated = createCommentSchema.parse({
      content: data.content,
      isInternal: false,
    });

    const commentsCollection = await getCollection<Comment>("comments");
    const commentObjectId = new ObjectId(commentId);
    const expectedDate = new Date(data.expectedUpdatedAt);

    // Fetch existing comment
    const existing = await commentsCollection.findOne({
      _id: commentObjectId,
      ticketId,
    });
    if (!existing) {
      return { success: false, error: "Comment not found" };
    }

    // Authorization: only author can edit own comment
    if (existing.userId !== userId) {
      return {
        success: false,
        error: "You can only edit your own comments",
      };
    }

    // Concurrency check: ensure updatedAt matches expected
    const matchFilter = {
      _id: commentObjectId,
      updatedAt: expectedDate,
    };
    const updateData = {
      $set: {
        content: validated.content,
        updatedAt: now,
      },
    };
    const result = await commentsCollection.updateOne(matchFilter, updateData);

    if (result.matchedCount === 0) {
      return {
        success: false,
        error:
          "Edit conflict detected. Please reload to get the latest comment before editing.",
      };
    }

    // Record edit history
    const historyCollection = await getCollection("comment_edit_history");
    await historyCollection.insertOne({
      commentId: commentId,
      ticketId,
      editedBy: userId,
      previousContent: existing.content,
      newContent: validated.content,
      previousUpdatedAt:
        existing.updatedAt instanceof Date
          ? existing.updatedAt.toISOString()
          : existing.updatedAt,
      newUpdatedAt: now.toISOString(),
      editedAt: now.toISOString(),
    });

    // Update request lastActivityAt
    const requestsCollection = await getCollection(collectionName);
    await requestsCollection.updateOne(
      { _id: new ObjectId(ticketId) },
      { $set: { lastActivityAt: now } }
    );

    // Audit log in ticket history
    const ticketHistory = await getCollection("ticket_history");
    await ticketHistory.insertOne({
      ticketId: new ObjectId(ticketId),
      requestType: kind,
      userId,
      action: "comment_edited",
      metadata: {
        commentId,
      },
      createdAt: now,
    });

    // Revalidate paths
    const paths = getRequestPaths(
      ticketId,
      kind,
      kind === "service" ? (request as Ticket).serviceSlug : undefined
    );
    revalidatePath(paths.dashboardDetail);
    revalidatePath(paths.dashboardList);
    revalidatePath(paths.adminDetail);
    revalidatePath(paths.adminList);
    revalidatePath(paths.supportDetail);
    revalidatePath(paths.supportList);

    const updated = await commentsCollection.findOne({ _id: commentObjectId });
    const serialized: SerializedComment = {
      ...(updated as Comment),
      _id: commentId,
      createdAt: String(
        (updated as Comment).createdAt instanceof Date
          ? (updated as Comment).createdAt.toISOString()
          : (updated as Comment).createdAt
      ),
      updatedAt: String(
        (updated as Comment).updatedAt instanceof Date
          ? (updated as Comment).updatedAt.toISOString()
          : (updated as Comment).updatedAt
      ),
    };

    emitCommentUpdated(ticketId, serialized);

    return {
      success: true,
      data: serialized as unknown as Comment,
      message: "Comment updated successfully",
    };
  } catch (error: unknown) {
    console.error("Error updating comment:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update comment",
    };
  }
}
