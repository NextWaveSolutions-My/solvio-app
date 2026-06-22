"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { requireAuth, requirePermissionOrThrow } from "@/lib/auth-utils";
import { createMeetingSchema, updateMeetingSchema } from "@/lib/validations";
import { createNotification } from "@/lib/notifications";
import { getSystemSettings } from "@/lib/settings-utils";
import { findRequestById, getRequestPaths } from "@/lib/request-utils";
import type {
  ApiResponse,
  Meeting,
  MeetingFormData,
  Ticket,
  User,
} from "@/types";

/**
 * Schedule a new meeting for a ticket
 */
export async function scheduleMeeting(
  ticketId: string,
  data: MeetingFormData,
  commentId?: string
): Promise<ApiResponse<Meeting>> {
  try {
    const session = await requirePermissionOrThrow("meetings.manage", {
      message: "Forbidden: Meetings manage access required",
    });
    const userId = session.user.id;

    // Validate input
    const validatedData = createMeetingSchema.parse(data);

    // Check if ticket/request exists
    const { request, kind, collectionName } = await findRequestById(ticketId);

    if (!request || !kind || !collectionName) {
      return {
        success: false,
        error: "Ticket not found",
      };
    }

    const ticket = request as Ticket;

    // Create meeting object
    const now = new Date();
    const meeting: Omit<Meeting, "_id"> = {
      ticketId,
      userId,
      platform: validatedData.platform,
      title: validatedData.title,
      description: validatedData.description,
      scheduledAt: validatedData.scheduledAt,
      duration: validatedData.duration || 60, // Default 60 minutes
      meetingLink: validatedData.meetingLink,
      timezone: validatedData.timezone,
      status: "scheduled",
      commentId,
      createdAt: now,
      updatedAt: now,
    };

    // Insert into database
    const meetingsCollection = await getCollection<Meeting>("meetings");
    const result = await meetingsCollection.insertOne(
      meeting as unknown as Meeting
    );

    // Update ticket/request lastActivityAt and status if currently "open"
    const ticketUpdate: { lastActivityAt: Date; status?: Ticket["status"] } = {
      lastActivityAt: now,
    };
    if (ticket.status === "open") {
      ticketUpdate.status = "scheduled_meeting";
    }

    const ticketsCollection = await getCollection(collectionName);
    await ticketsCollection.updateOne(
      { _id: new ObjectId(ticketId) },
      { $set: ticketUpdate }
    );

    // Create history entry for meeting scheduled
    const historyCollection = await getCollection("ticket_history");
    await historyCollection.insertOne({
      ticketId: new ObjectId(ticketId),
      requestType: kind,
      userId,
      action: "meeting_scheduled",
      details: `Scheduled ${
        validatedData.platform === "zoom" ? "Zoom" : "Google Meet"
      } meeting: ${validatedData.title}`,
      metadata: {
        meetingId: result.insertedId.toString(),
        meetingTitle: validatedData.title,
      },
      createdAt: now,
    });

    // Create history entry for status change if status was updated
    if (ticket.status === "open") {
      await historyCollection.insertOne({
        ticketId: new ObjectId(ticketId),
        requestType: kind,
        userId,
        action: "status_changed",
        oldValue: "open",
        newValue: "scheduled_meeting",
        createdAt: now,
      });
    }

    // Send email notification to customer
    if (process.env.EMAIL_NOTIFICATIONS_ENABLED === "true") {
      try {
        const { sendEmail, emailTemplates } = await import("@/lib/email");
        const usersCollection = await getCollection("user");

        // Get customer email from ticket
        const customer = await usersCollection.findOne({
          id: ticket.customerId,
        });

        if (customer && customer.email) {
          // Format the scheduled date/time for email in the meeting or system timezone
          const scheduledAtFormatted = validatedData.scheduledAt.toLocaleString(
            "en-US",
            {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZoneName: "short",
              timeZone:
                validatedData.timezone ||
                (await getSystemSettings()).general.timezone,
            }
          );

          await sendEmail({
            to: customer.email,
            ...emailTemplates.meetingScheduled(
              ticket.ticketNumber,
              ticket.title,
              validatedData.title,
              scheduledAtFormatted,
              validatedData.duration || 60,
              validatedData.platform,
              validatedData.meetingLink,
              validatedData.timezone,
              validatedData.description
            ),
          });
        }
      } catch (emailError) {
        console.error("Failed to send meeting scheduled email:", emailError);
        // Don't fail the entire operation if email fails
      }
    }

    // Send real-time notification to customer
    try {
      if (ticket.customerId) {
        const scheduledAtFormatted = validatedData.scheduledAt.toLocaleString(
          "en-US",
          {
            weekday: "long",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
            timeZone:
              validatedData.timezone ||
              (await getSystemSettings()).general.timezone,
          }
        );

        const paths = getRequestPaths(
          ticketId,
          kind,
          kind === "service" ? (ticket as Ticket).serviceSlug : undefined
        );

        await createNotification({
          userId: ticket.customerId,
          type: "meeting_scheduled",
          title: "Meeting Scheduled",
          body: `A meeting has been scheduled for ticket #${ticket.ticketNumber} on ${scheduledAtFormatted}`,
          data: {
            ticketId: ticketId,
            ticketNumber: ticket.ticketNumber,
            meetingId: result.insertedId.toString(),
            meetingTitle: validatedData.title,
            scheduledAt: validatedData.scheduledAt.toISOString(),
            url: paths.dashboardDetail,
          },
        });
      }
    } catch (notificationError) {
      console.error(
        "Failed to send meeting scheduled notification:",
        notificationError
      );
      // Don't fail the entire operation if notification fails
    }

    // Revalidate paths based on request kind
    const paths = getRequestPaths(
      ticketId,
      kind,
      kind === "service" ? (ticket as Ticket).serviceSlug : undefined
    );
    revalidatePath(paths.dashboardDetail);
    revalidatePath(paths.dashboardList);
    revalidatePath(paths.adminDetail);
    revalidatePath(paths.adminList);

    // Serialize the meeting data to avoid ObjectId serialization issues
    const serializedMeeting = {
      ...meeting,
      _id: result.insertedId.toString(),
      scheduledAt: meeting.scheduledAt.toISOString(),
      createdAt: meeting.createdAt.toISOString(),
      updatedAt: meeting.updatedAt.toISOString(),
    };

    return {
      success: true,
      data: serializedMeeting as unknown as Meeting,
      message: "Meeting scheduled successfully",
    };
  } catch (error) {
    console.error(
      "Error scheduling meeting:",
      error instanceof Error ? error : String(error)
    );
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to scheduled meeting",
    };
  }
}

/**
 * Get all meetings for a ticket
 * Customers can view meetings for their own tickets
 * Admin/Support can view all meetings
 */
export async function getTicketMeetings(
  ticketId: string
): Promise<ApiResponse<Meeting[]>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const userRole = (session.user as User).role;

    // Check if ticket/request exists and user has access
    const { request } = await findRequestById(ticketId);

    if (!request) {
      return {
        success: false,
        error: "Ticket not found",
      };
    }

    const ticket = request as Ticket;

    // Customers can only view meetings for their own tickets/requests
    if (userRole === "customer" && ticket.customerId !== userId) {
      return {
        success: false,
        error: "You don't have permission to view these meetings",
      };
    }

    const meetingsCollection = await getCollection<Meeting>("meetings");
    const meetings = await meetingsCollection
      .find({ ticketId })
      .sort({ scheduledAt: -1 })
      .toArray();

    // Serialize to plain objects (convert ObjectIds and Dates to strings)
    const serializedMeetings = JSON.parse(JSON.stringify(meetings));

    return {
      success: true,
      data: serializedMeetings as Meeting[],
    };
  } catch (error) {
    console.error(
      "Error fetching meetings:",
      error instanceof Error ? error : String(error)
    );
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch meetings",
    };
  }
}

/**
 * Update a meeting
 */
export async function updateMeeting(
  meetingId: string,
  data: Partial<MeetingFormData> & {
    status?: "scheduled" | "completed" | "cancelled";
    cancellationReason?: string;
  }
): Promise<ApiResponse<Meeting>> {
  try {
    // Only admin/support can update meetings
    const session = await requirePermissionOrThrow("meetings.manage", {
      message: "Forbidden: Meetings manage access required",
    });
    const userId = session.user.id;

    // Validate input
    const validatedData = updateMeetingSchema.parse(data);

    // Get the meeting
    const meetingsCollection = await getCollection<Meeting>("meetings");
    const meeting = await meetingsCollection.findOne({
      _id: new ObjectId(meetingId),
    });

    if (!meeting) {
      return {
        success: false,
        error: "Meeting not found",
      };
    }

    // Prepare update data
    const now = new Date();
    const updateData: Record<string, unknown> = {
      ...validatedData,
      updatedAt: now,
    };

    // Add status-specific timestamps
    if (
      validatedData.status === "completed" &&
      meeting.status !== "completed"
    ) {
      updateData.completedAt = now;
    }
    if (
      validatedData.status === "cancelled" &&
      meeting.status !== "cancelled"
    ) {
      updateData.cancelledAt = now;
    }

    // Update meeting
    const result = await meetingsCollection.findOneAndUpdate(
      { _id: new ObjectId(meetingId) },
      { $set: updateData },
      { returnDocument: "after" }
    );

    if (!result) {
      return {
        success: false,
        error: "Failed to update meeting",
      };
    }

    // Resolve parent ticket/request
    const { request, kind, collectionName } = await findRequestById(
      meeting.ticketId
    );

    if (!request || !kind || !collectionName) {
      return {
        success: false,
        error: "Ticket not found for this meeting",
      };
    }

    const ticket = request as Ticket;

    // Update ticket/request lastActivityAt
    const ticketsCollection = await getCollection(collectionName);
    await ticketsCollection.updateOne(
      { _id: new ObjectId(meeting.ticketId) },
      { $set: { lastActivityAt: now } }
    );

    // Create history entry
    const historyCollection = await getCollection("ticket_history");
    let action: "meeting_updated" | "meeting_completed" | "meeting_cancelled" =
      "meeting_updated";
    let details = `Updated meeting: ${meeting.title}`;

    if (validatedData.status === "completed") {
      action = "meeting_completed";
      details = `Completed meeting: ${meeting.title}`;
    } else if (validatedData.status === "cancelled") {
      action = "meeting_cancelled";
      details = `Cancelled meeting: ${meeting.title}`;
      if (validatedData.cancellationReason) {
        details += ` - Reason: ${validatedData.cancellationReason}`;
      }
    }

    await historyCollection.insertOne({
      ticketId: new ObjectId(meeting.ticketId),
      requestType: kind,
      userId,
      action,
      details,
      metadata: {
        meetingId: meetingId,
        meetingTitle: meeting.title,
      },
      createdAt: now,
    });

    // Send notifications for meeting updates
    try {
      const paths = getRequestPaths(
        meeting.ticketId,
        kind,
        kind === "service" ? (ticket as Ticket).serviceSlug : undefined
      );
      const dataPayload = {
        ticketId: meeting.ticketId,
        ticketNumber: ticket.ticketNumber,
        meetingId: meetingId,
        meetingTitle: meeting.title,
        url: paths.dashboardDetail,
      };
      if (
        validatedData.status === "cancelled" &&
        meeting.status !== "cancelled"
      ) {
        if (ticket.customerId) {
          await (
            await import("@/lib/notifications")
          ).dispatchUserNotification({
            userId: ticket.customerId,
            type: "meeting_cancelled",
            title: "Meeting Cancelled",
            body: `The meeting for ticket #${
              ticket.ticketNumber
            } has been cancelled${
              validatedData.cancellationReason
                ? `: ${validatedData.cancellationReason}`
                : ""
            }`,
            data: dataPayload,
            email:
              process.env.EMAIL_NOTIFICATIONS_ENABLED === "true"
                ? {
                    subject: `Meeting Cancelled for Ticket ${ticket.ticketNumber}`,
                    html: (
                      await import("@/lib/email")
                    ).emailTemplates.meetingUpdated(
                      ticket.ticketNumber,
                      ticket.title,
                      meeting.title,
                      {
                        status: "cancelled",
                        reason: validatedData.cancellationReason || "",
                      }
                    ).html,
                  }
                : undefined,
          });
        }
      } else {
        // General meeting update (time, duration, link, status changes)
        if (ticket.customerId) {
          const updatedFields: Record<string, string | number> = {};
          if (validatedData.scheduledAt) {
            updatedFields["Date & Time"] =
              validatedData.scheduledAt.toLocaleString();
          }
          if (validatedData.duration) {
            updatedFields["Duration"] = validatedData.duration;
          }
          if (validatedData.meetingLink) {
            updatedFields["Meeting Link"] = validatedData.meetingLink;
          }
          if (validatedData.status) {
            updatedFields["Status"] = validatedData.status;
          }
          await (
            await import("@/lib/notifications")
          ).dispatchUserNotification({
            userId: ticket.customerId,
            type: "meeting_updated",
            title: "Meeting Updated",
            body: `Meeting "${meeting.title}" for ticket #${ticket.ticketNumber} was updated`,
            data: dataPayload,
            email:
              process.env.EMAIL_NOTIFICATIONS_ENABLED === "true"
                ? {
                    subject: `Meeting Updated for Ticket ${ticket.ticketNumber}`,
                    html: (
                      await import("@/lib/email")
                    ).emailTemplates.meetingUpdated(
                      ticket.ticketNumber,
                      ticket.title,
                      meeting.title,
                      updatedFields,
                      meeting.meetingLink
                    ).html,
                  }
                : undefined,
          });
        }
      }
    } catch (notificationError) {
      console.error(
        "Failed to send meeting cancelled notification:",
        notificationError
      );
      // Don't fail the entire operation if notification fails
    }

    // Revalidate paths
    const paths = getRequestPaths(
      meeting.ticketId,
      kind,
      kind === "service" ? (ticket as Ticket).serviceSlug : undefined
    );
    revalidatePath(paths.dashboardDetail);
    revalidatePath(paths.dashboardList);
    revalidatePath(paths.adminDetail);
    revalidatePath(paths.adminList);

    // Serialize the meeting data to avoid ObjectId serialization issues
    const serializedMeeting = {
      ...result,
      _id: result._id.toString(),
      ticketId: result.ticketId,
      scheduledAt: result.scheduledAt.toISOString(),
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
      completedAt: result.completedAt
        ? result.completedAt.toISOString()
        : undefined,
      cancelledAt: result.cancelledAt
        ? result.cancelledAt.toISOString()
        : undefined,
    };

    return {
      success: true,
      data: serializedMeeting as unknown as Meeting,
      message: "Meeting updated successfully",
    };
  } catch (error) {
    console.error(
      "Error updating meeting:",
      error instanceof Error ? error : String(error)
    );
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update meeting",
    };
  }
}

/**
 * Delete a meeting
 */
export async function deleteMeeting(
  meetingId: string
): Promise<ApiResponse<void>> {
  try {
    // Only admin/support can delete meetings
    const session = await requirePermissionOrThrow("meetings.manage", {
      message: "Forbidden: Meetings manage access required",
    });
    const userId = session.user.id;

    // Get the meeting
    const meetingsCollection = await getCollection<Meeting>("meetings");
    const meeting = await meetingsCollection.findOne({
      _id: new ObjectId(meetingId),
    });

    if (!meeting) {
      return {
        success: false,
        error: "Meeting not found",
      };
    }

    // Resolve parent ticket/request
    const { request, kind, collectionName } = await findRequestById(
      meeting.ticketId
    );

    if (!request || !kind || !collectionName) {
      return {
        success: false,
        error: "Ticket not found for this meeting",
      };
    }

    const now = new Date();

    // Delete the meeting
    await meetingsCollection.deleteOne({ _id: new ObjectId(meetingId) });

    // Update ticket/request lastActivityAt
    const ticketsCollection = await getCollection(collectionName);
    await ticketsCollection.updateOne(
      { _id: new ObjectId(meeting.ticketId) },
      { $set: { lastActivityAt: now } }
    );

    // Create history entry
    const historyCollection = await getCollection("ticket_history");
    await historyCollection.insertOne({
      ticketId: new ObjectId(meeting.ticketId),
      requestType: kind,
      userId,
      action: "meeting_cancelled",
      details: `Deleted meeting: ${meeting.title}`,
      metadata: {
        meetingTitle: meeting.title,
      },
      createdAt: now,
    });

    // Revalidate paths
    const paths = getRequestPaths(
      meeting.ticketId,
      kind,
      kind === "service" ? (request as Ticket).serviceSlug : undefined
    );
    revalidatePath(paths.dashboardDetail);
    revalidatePath(paths.dashboardList);
    revalidatePath(paths.adminDetail);
    revalidatePath(paths.adminList);

    return {
      success: true,
      message: "Meeting deleted successfully",
    };
  } catch (error) {
    console.error(
      "Error deleting meeting:",
      error instanceof Error ? error : String(error)
    );
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete meeting",
    };
  }
}

/**
 * Request a meeting reschedule (customer only)
 */
export async function requestMeetingReschedule(
  meetingId: string,
  preferredTime: Date,
  reason?: string
): Promise<ApiResponse<Meeting>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Get the meeting
    const meetingsCollection = await getCollection<Meeting>("meetings");
    const meeting = await meetingsCollection.findOne({
      _id: new ObjectId(meetingId),
    });

    if (!meeting) {
      return {
        success: false,
        error: "Meeting not found",
      };
    }

    // Only allow reschedule requests for scheduled meetings
    if (meeting.status !== "scheduled") {
      return {
        success: false,
        error: "Can only request reschedule for scheduled meetings",
      };
    }

    // Update meeting with reschedule request
    const now = new Date();
    const result = await meetingsCollection.findOneAndUpdate(
      { _id: new ObjectId(meetingId) },
      {
        $set: {
          rescheduleRequest: {
            requestedBy: userId,
            requestedAt: now,
            preferredTime: preferredTime,
            reason: reason,
            status: "pending",
          },
          updatedAt: now,
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return {
        success: false,
        error: "Failed to update meeting",
      };
    }

    // Resolve parent ticket/request
    const { kind, request } = await findRequestById(meeting.ticketId);

    // Add to ticket/request history
    const historyCollection = await getCollection("ticket_history");
    await historyCollection.insertOne({
      _id: new ObjectId(),
      ticketId: new ObjectId(meeting.ticketId),
      requestType: kind,
      userId,
      action: "comment_added",
      metadata: {
        type: "reschedule_request",
        meetingId: meetingId,
        preferredTime: preferredTime.toISOString(),
        reason: reason,
      },
      createdAt: now,
    });

    // Revalidate paths
    if (kind) {
      const paths = getRequestPaths(
        meeting.ticketId,
        kind,
        kind === "service" ? (request as Ticket).serviceSlug : undefined
      );
      revalidatePath(paths.dashboardDetail);
      revalidatePath(paths.dashboardList);
      revalidatePath(paths.adminDetail);
      revalidatePath(paths.adminList);
    }

    // Serialize the meeting data to avoid ObjectId serialization issues
    const serializedMeeting = {
      ...result,
      _id: result._id.toString(),
      scheduledAt: result.scheduledAt.toISOString(),
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
      completedAt: result.completedAt?.toISOString(),
      cancelledAt: result.cancelledAt?.toISOString(),
      rescheduleRequest: result.rescheduleRequest
        ? {
            ...result.rescheduleRequest,
            requestedAt: result.rescheduleRequest.requestedAt.toISOString(),
            preferredTime: result.rescheduleRequest.preferredTime.toISOString(),
          }
        : undefined,
    };

    return {
      success: true,
      data: serializedMeeting as unknown as Meeting,
      message: "Reschedule request submitted successfully",
    };
  } catch (error) {
    console.error(
      "Error requesting meeting reschedule:",
      error instanceof Error ? error : String(error)
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to request meeting reschedule",
    };
  }
}

/**
 * Confirm meeting attendance (customer only)
 */
export async function confirmMeetingAttendance(
  meetingId: string
): Promise<ApiResponse<Meeting>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const meetingsCollection = await getCollection<Meeting>("meetings");
    const meeting = await meetingsCollection.findOne({
      _id: new ObjectId(meetingId),
    });

    if (!meeting) {
      return { success: false, error: "Meeting not found" };
    }

    if (meeting.status !== "scheduled") {
      return {
        success: false,
        error: "Can only confirm scheduled meetings",
      };
    }

    const now = new Date();
    const result = await meetingsCollection.findOneAndUpdate(
      { _id: new ObjectId(meetingId) },
      {
        $set: {
          customerConfirmation: {
            confirmed: true,
            confirmedAt: now,
            confirmedBy: userId,
          },
          updatedAt: now,
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return { success: false, error: "Failed to confirm meeting" };
    }

    // Resolve parent ticket/request
    const { kind, request } = await findRequestById(meeting.ticketId);

    // Add to ticket/request history
    const historyCollection = await getCollection("ticket_history");
    await historyCollection.insertOne({
      _id: new ObjectId(),
      ticketId: new ObjectId(meeting.ticketId),
      requestType: kind,
      userId,
      action: "comment_added",
      metadata: {
        type: "meeting_confirmed",
        meetingId: meetingId,
      },
      createdAt: now,
    });

    // Revalidate paths
    if (kind) {
      const paths = getRequestPaths(
        meeting.ticketId,
        kind,
        kind === "service" ? (request as Ticket).serviceSlug : undefined
      );
      revalidatePath(paths.dashboardDetail);
      revalidatePath(paths.dashboardList);
      revalidatePath(paths.adminDetail);
      revalidatePath(paths.adminList);
    }

    // Serialize the meeting data
    const serializedMeeting = {
      ...result,
      _id: result._id.toString(),
      scheduledAt: result.scheduledAt.toISOString(),
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
      completedAt: result.completedAt?.toISOString(),
      cancelledAt: result.cancelledAt?.toISOString(),
      rescheduleRequest: result.rescheduleRequest
        ? {
            ...result.rescheduleRequest,
            requestedAt: result.rescheduleRequest.requestedAt.toISOString(),
            preferredTime: result.rescheduleRequest.preferredTime.toISOString(),
          }
        : undefined,
      customerConfirmation: result.customerConfirmation
        ? {
            ...result.customerConfirmation,
            confirmedAt: result.customerConfirmation.confirmedAt?.toISOString(),
          }
        : undefined,
    };

    return {
      success: true,
      data: serializedMeeting as unknown as Meeting,
      message: "Meeting attendance confirmed successfully",
    };
  } catch (error) {
    console.error(
      "Error confirming meeting attendance:",
      error instanceof Error ? error : String(error)
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to confirm meeting attendance",
    };
  }
}
