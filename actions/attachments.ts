"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth-utils";
import { getCollection } from "@/lib/db";
import { uploadFile, deleteFile, isFileUploadsEnabled } from "@/lib/storage";
import { findRequestById, getRequestPaths } from "@/lib/request-utils";
import type { ApiResponse, Attachment, Ticket, User } from "@/types";

/**
 * Upload multiple attachments during ticket creation
 */
export async function uploadTicketAttachments(
  ticketId: string,
  formData: FormData
): Promise<ApiResponse<Attachment[]>> {
  try {
    // Check if file uploads are enabled
    if (!isFileUploadsEnabled()) {
      return {
        success: false,
        error: "File uploads are not enabled",
      };
    }

    const session = await requireAuth();
    const userId = session.user.id;

    // Get all files from form data
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return {
        success: true,
        data: [],
        message: "No files to upload",
      };
    }

    // Verify ticket/request exists and user has access
    const { request, kind, collectionName } = await findRequestById(ticketId);

    if (!request || !kind || !collectionName) {
      return {
        success: false,
        error: "Ticket not found",
      };
    }

    const ticket = request as Ticket;

    // Check if user has access to this ticket/request
    const userRole = (session.user as User).role;
    if (userRole === "customer" && ticket.customerId !== userId) {
      return {
        success: false,
        error: "You don't have permission to upload files to this ticket",
      };
    }

    // Upload all files
    const uploadedAttachments: Attachment[] = [];
    const attachmentsCollection = await getCollection<Attachment>(
      "attachments"
    );

    for (const file of files) {
      try {
        // Upload file to R2
        const uploadedFile = await uploadFile({
          file,
          folder: "tickets",
          userId,
          ticketId,
        });

        // Save attachment metadata to database
        const attachment: Attachment = {
          _id: new ObjectId(),
          ticketId: new ObjectId(ticketId),
          userId,
          filename: uploadedFile.filename,
          originalFilename: uploadedFile.filename,
          fileSize: uploadedFile.size,
          mimeType: uploadedFile.mimeType,
          storageKey: uploadedFile.key,
          url: uploadedFile.url,
          uploadedAt: new Date(),
        };

        await attachmentsCollection.insertOne(attachment);
        uploadedAttachments.push(attachment);
      } catch (error) {
        console.error(
          `Error uploading file ${file.name}:`,
          error instanceof Error ? error : String(error)
        );
        // Continue with other files even if one fails
      }
    }

    // Update ticket/request last activity
    const ticketsCollection = await getCollection(collectionName);
    await ticketsCollection.updateOne(
      { _id: new ObjectId(ticketId) },
      { $set: { lastActivityAt: new Date() } }
    );

    // Create ticket/request history entry
    if (uploadedAttachments.length > 0) {
      const historyCollection = await getCollection("ticket_history");
      await historyCollection.insertOne({
        ticketId: new ObjectId(ticketId),
        requestType: kind,
        userId,
        action: "attachment_added",
        details: `Added ${uploadedAttachments.length} attachment(s)`,
        createdAt: new Date(),
      });

      try {
        const usersCollection = await getCollection<User>("user");
        const uploader = await usersCollection.findOne({ id: userId });
        const filenameList = uploadedAttachments
          .map((a) => a.originalFilename || a.filename)
          .filter(Boolean)
          .join(", ");
        const paths = getRequestPaths(
          ticketId,
          kind,
          kind === "service" ? (ticket as Ticket).serviceSlug : undefined
        );
        const titlePrefix =
          kind === "installation"
            ? "Installation Request"
            : kind === "customization"
            ? "Customization Request"
            : "Ticket";

        if ((session.user as User).role !== "customer") {
          const customerRecipientId = ticket.customerId;
          await (
            await import("@/lib/notifications")
          ).dispatchUserNotification({
            userId: customerRecipientId,
            type: "attachment",
            title: `New Attachment on ${titlePrefix}`,
            body: `${uploader?.name || "Support"} uploaded: ${filenameList}`,
            data: {
              ticketId,
              ticketNumber: ticket.ticketNumber,
              url: paths.dashboardDetail,
            },
            email:
              process.env.EMAIL_NOTIFICATIONS_ENABLED === "true"
                ? {
                    subject: `Attachment Uploaded on ${ticket.ticketNumber}`,
                    html: (
                      await import("@/lib/email")
                    ).emailTemplates.attachmentUploaded(
                      ticket.ticketNumber,
                      ticket.title,
                      uploader?.name || "Support",
                      filenameList,
                      paths.dashboardDetail
                    ).html,
                  }
                : undefined,
            metadata: {
              filenames: uploadedAttachments.map((a) => a.filename),
            },
          });
        } else {
          const assignedIdRaw = (ticket as Ticket).assignedToId || null;
          const recipients: string[] = [];
          if (assignedIdRaw) {
            recipients.push(assignedIdRaw);
            const assignedUser = await usersCollection.findOne({
              $or: [
                { id: assignedIdRaw },
                ObjectId.isValid(assignedIdRaw)
                  ? { _id: new ObjectId(assignedIdRaw) }
                  : {},
              ].filter((q) => Object.keys(q).length > 0),
            });
            if (assignedUser?.id && assignedUser.id !== assignedIdRaw) {
              recipients.push(assignedUser.id);
            }
            const legacyAssignedId = assignedUser?._id?.toString();
            if (legacyAssignedId && legacyAssignedId !== assignedIdRaw) {
              recipients.push(legacyAssignedId);
            }
          } else {
            const { getUserIdsByRole } = await import("@/lib/user-utils");
            recipients.push(...(await getUserIdsByRole(["admin"])));
            const adminDocs = await usersCollection
              .find({ role: { $in: ["admin"] } })
              .toArray();
            const legacyAdminIds = adminDocs
              .map((u: { _id?: ObjectId }) => u?._id?.toString?.())
              .filter(Boolean) as string[];
            recipients.push(...legacyAdminIds);
          }
          for (const rid of Array.from(new Set(recipients))) {
            const isSupportView = !!assignedIdRaw;
            const url = isSupportView ? paths.supportDetail : paths.adminDetail;
            await (
              await import("@/lib/notifications")
            ).dispatchUserNotification({
              userId: rid,
              type: "attachment",
              title: "New Attachment from Customer",
              body: `${uploader?.name || "Customer"} uploaded: ${filenameList}`,
              data: {
                ticketId,
                ticketNumber: ticket.ticketNumber,
                url,
              },
              email:
                process.env.EMAIL_NOTIFICATIONS_ENABLED === "true"
                  ? {
                      subject: `Attachment Uploaded on ${ticket.ticketNumber}`,
                      html: (
                        await import("@/lib/email")
                      ).emailTemplates.attachmentUploaded(
                        ticket.ticketNumber,
                        ticket.title,
                        uploader?.name || "Customer",
                        filenameList,
                        url
                      ).html,
                    }
                  : undefined,
              metadata: {
                filenames: uploadedAttachments.map((a) => a.filename),
              },
            });
          }
        }
      } catch (notifyError) {
        console.error(
          "Failed to dispatch attachment notifications:",
          notifyError
        );
      }
    }

    const paths = getRequestPaths(
      ticketId,
      kind,
      kind === "service" ? (ticket as Ticket).serviceSlug : undefined
    );
    revalidatePath(paths.dashboardDetail);
    revalidatePath(paths.dashboardList);
    revalidatePath(paths.adminDetail);
    revalidatePath(paths.adminList);

    // Serialize attachments to avoid ObjectId serialization issues
    const serializedAttachments = uploadedAttachments.map((att) => ({
      ...att,
      _id: att._id.toString(),
      ticketId: att.ticketId.toString(),
      uploadedAt: att.uploadedAt.toISOString(),
    }));

    return {
      success: true,
      data: serializedAttachments as unknown as Attachment[],
      message: `Successfully uploaded ${uploadedAttachments.length} file(s)`,
    };
  } catch (error) {
    console.error(
      "Error uploading attachments:",
      error instanceof Error ? error : String(error)
    );
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to upload attachments",
    };
  }
}

/**
 * Upload attachment to a ticket
 */
export async function uploadAttachment(
  ticketId: string,
  formData: FormData
): Promise<ApiResponse<Attachment>> {
  try {
    // Check if file uploads are enabled
    if (!isFileUploadsEnabled()) {
      return {
        success: false,
        error: "File uploads are not enabled",
      };
    }

    const session = await requireAuth();
    const userId = session.user.id;

    // Get file from form data
    const file = formData.get("file") as File;
    if (!file) {
      return {
        success: false,
        error: "No file provided",
      };
    }

    // Verify ticket/request exists and user has access
    const { request, kind, collectionName } = await findRequestById(ticketId);

    if (!request || !kind || !collectionName) {
      return {
        success: false,
        error: "Ticket not found",
      };
    }

    const ticket = request as Ticket;

    // Check if user has access to this ticket/request
    const userRole = (session.user as User).role;
    if (userRole === "customer" && ticket.customerId !== userId) {
      return {
        success: false,
        error: "You don't have permission to upload files to this ticket",
      };
    }

    // Upload file to R2
    const uploadedFile = await uploadFile({
      file,
      folder: "tickets",
      userId,
      ticketId,
    });

    // Optional comment linkage (for inline attachments posted with a comment)
    const commentIdField = formData.get("commentId");
    const commentId =
      typeof commentIdField === "string" && commentIdField.length > 0
        ? commentIdField
        : undefined;

    // Save attachment metadata to database
    const attachmentsCollection = await getCollection<Attachment>(
      "attachments"
    );
    const attachment: Attachment = {
      _id: new ObjectId(),
      ticketId: new ObjectId(ticketId),
      commentId,
      userId,
      filename: uploadedFile.filename,
      originalFilename: uploadedFile.filename,
      fileSize: uploadedFile.size,
      mimeType: uploadedFile.mimeType,
      storageKey: uploadedFile.key,
      url: uploadedFile.url,
      uploadedAt: new Date(),
    };

    await attachmentsCollection.insertOne(attachment);

    // Update ticket/request lastActivityAt
    const ticketsCollection = await getCollection(collectionName);
    await ticketsCollection.updateOne(
      { _id: new ObjectId(ticketId) },
      {
        $set: { lastActivityAt: new Date() },
      }
    );

    // Add to ticket/request history
    const historyCollection = await getCollection("ticket_history");
    await historyCollection.insertOne({
      _id: new ObjectId(),
      ticketId: new ObjectId(ticketId),
      requestType: kind,
      userId,
      action: "attachment_added",
      changes: {
        filename: uploadedFile.filename,
        fileSize: uploadedFile.size,
      },
      createdAt: new Date(),
    });

    const paths = getRequestPaths(
      ticketId,
      kind,
      kind === "service" ? (ticket as Ticket).serviceSlug : undefined
    );
    revalidatePath(paths.dashboardDetail);
    revalidatePath(paths.dashboardList);
    revalidatePath(paths.adminDetail);
    revalidatePath(paths.adminList);

    // Serialize attachment to avoid ObjectId serialization issues
    const serializedAttachment = {
      ...attachment,
      _id: attachment._id.toString(),
      ticketId: attachment.ticketId.toString(),
      uploadedAt: attachment.uploadedAt.toISOString(),
    };

    return {
      success: true,
      data: serializedAttachment as unknown as Attachment,
    };
  } catch (error) {
    console.error("Error uploading attachment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload file",
    };
  }
}

/**
 * Get all attachments for a ticket
 */
export async function getTicketAttachments(
  ticketId: string
): Promise<ApiResponse<Attachment[]>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const userRole = (session.user as User).role;

    // Verify ticket/request exists and user has access
    const { request } = await findRequestById(ticketId);

    if (!request) {
      return {
        success: false,
        error: "Ticket not found",
      };
    }

    const ticket = request as Ticket;

    // Check if user has access to this ticket/request
    if (userRole === "customer" && ticket.customerId !== userId) {
      return {
        success: false,
        error: "You don't have permission to view this ticket's attachments",
      };
    }

    // Get attachments
    const attachmentsCollection = await getCollection<Attachment>(
      "attachments"
    );
    const attachments = await attachmentsCollection
      .find({ ticketId: new ObjectId(ticketId) })
      .sort({ uploadedAt: -1 })
      .toArray();

    // Serialize to plain objects (convert ObjectIds and Dates to strings)
    const serializedAttachments = JSON.parse(JSON.stringify(attachments));

    return {
      success: true,
      data: serializedAttachments,
    };
  } catch (error) {
    console.error("Error fetching attachments:", error);
    return {
      success: false,
      error: "Failed to fetch attachments",
    };
  }
}

/**
 * Delete an attachment
 */
export async function deleteAttachment(
  attachmentId: string
): Promise<ApiResponse<void>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const userRole = (session.user as User).role;

    // Get attachment
    const attachmentsCollection = await getCollection<Attachment>(
      "attachments"
    );
    const attachment = await attachmentsCollection.findOne({
      _id: new ObjectId(attachmentId),
    });

    if (!attachment) {
      return {
        success: false,
        error: "Attachment not found",
      };
    }

    // Check permissions
    // Only the uploader, support, or admin can delete
    if (userRole === "customer" && attachment.userId !== userId) {
      return {
        success: false,
        error: "You don't have permission to delete this attachment",
      };
    }

    // Delete from R2
    try {
      await deleteFile(attachment.storageKey);
    } catch (error) {
      console.error("Error deleting file from R2:", error);
      // Continue even if R2 deletion fails
    }

    // Resolve the parent ticket/request and collection
    const ticketIdString = attachment.ticketId.toString();
    const { request, kind, collectionName } = await findRequestById(
      ticketIdString
    );

    if (!request || !kind || !collectionName) {
      return {
        success: false,
        error: "Ticket not found for this attachment",
      };
    }

    // Delete from database
    await attachmentsCollection.deleteOne({ _id: new ObjectId(attachmentId) });

    // Update ticket/request lastActivityAt
    const ticketsCollection = await getCollection(collectionName);
    await ticketsCollection.updateOne(
      { _id: attachment.ticketId },
      {
        $set: { lastActivityAt: new Date() },
      }
    );

    // Add to ticket/request history
    const historyCollection = await getCollection("ticket_history");
    await historyCollection.insertOne({
      _id: new ObjectId(),
      ticketId: attachment.ticketId,
      requestType: kind,
      userId,
      action: "attachment_deleted",
      changes: {
        filename: attachment.filename,
      },
      createdAt: new Date(),
    });

    const paths = getRequestPaths(
      ticketIdString,
      kind,
      kind === "service" ? (request as Ticket).serviceSlug : undefined
    );
    revalidatePath(paths.dashboardDetail);
    revalidatePath(paths.dashboardList);
    revalidatePath(paths.adminDetail);
    revalidatePath(paths.adminList);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return {
      success: false,
      error: "Failed to delete attachment",
    };
  }
}

/**
 * Delete all attachments for a ticket (used when deleting a ticket)
 */
export async function deleteTicketAttachments(ticketId: string): Promise<void> {
  try {
    const attachmentsCollection = await getCollection<Attachment>(
      "attachments"
    );
    const attachments = await attachmentsCollection
      .find({ ticketId: new ObjectId(ticketId) })
      .toArray();

    // Delete all files from R2
    for (const attachment of attachments) {
      try {
        await deleteFile(attachment.storageKey);
      } catch (error) {
        console.error(`Error deleting file ${attachment.storageKey}:`, error);
      }
    }

    // Delete all attachment records
    await attachmentsCollection.deleteMany({
      ticketId: new ObjectId(ticketId),
    });
  } catch (error) {
    console.error("Error deleting ticket attachments:", error);
  }
}
