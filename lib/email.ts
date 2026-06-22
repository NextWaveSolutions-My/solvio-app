import nodemailer from "nodemailer";
import type { SystemSettings } from "@/types/settings";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export type EmailNotificationKey =
  | "newTicket"
  | "ticketUpdate"
  | "newComment"
  | "ticketAssignment"
  | "ticketResolution";

const emailSettingByNotificationKey: Record<
  EmailNotificationKey,
  keyof SystemSettings["email"]
> = {
  newTicket: "notifyOnNewTicket",
  ticketUpdate: "notifyOnTicketUpdate",
  newComment: "notifyOnNewComment",
  ticketAssignment: "notifyOnTicketAssignment",
  ticketResolution: "notifyOnTicketResolution",
};

const htmlEscapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

/** Centered call-to-action button used by customer-facing ticket emails. */
function ticketLinkButton(url: string | undefined, label: string): string {
  if (!url) return "";
  return `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${escapeHtml(url)}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">${escapeHtml(label)}</a>
        </div>`;
}

export function isEmailServiceEnabled(settings: SystemSettings): boolean {
  const envFlag = process.env.EMAIL_NOTIFICATIONS_ENABLED;
  if (envFlag === "true") return true;
  if (envFlag === "false") return false;
  return Boolean(settings.email?.enabled);
}

export async function shouldSendEmailNotification(
  key: EmailNotificationKey
): Promise<{ enabled: boolean; settings: SystemSettings }> {
  const { getSystemSettings } = await import("@/lib/settings-utils");
  const settings = await getSystemSettings();
  const eventSettingKey = emailSettingByNotificationKey[key];

  return {
    settings,
    enabled:
      isEmailServiceEnabled(settings) && Boolean(settings.email?.[eventSettingKey]),
  };
}

// Create reusable transporter
const createTransporter = () => {
  if (!process.env.EMAIL_SERVER_HOST) {
    throw new Error("Email server configuration is missing");
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
    secure: process.env.EMAIL_SERVER_PORT === "465", // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });
};

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  // Check if email notifications are enabled
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED === "false") {
    return { success: false, message: "Email notifications disabled" };
  }

  try {
    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML tags for text version
    });

    return { success: true, messageId: info.messageId };
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`Error sending email to ${to}:`, err.message);
    return { success: false, error: err };
  }
}

// Email templates
export const emailTemplates = {
  ticketCreated: (ticketNumber: string, title: string, viewUrl?: string) => ({
    subject: `Ticket Created: ${ticketNumber} - ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Your Support Ticket Has Been Created Successfully</h2>
        <p>Thank you for contacting us. Your support ticket has been created successfully.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Ticket Number:</strong> ${escapeHtml(ticketNumber)}</p>
          <p style="margin: 5px 0;"><strong>Title:</strong> ${escapeHtml(title)}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #10b981;">Open</span></p>
        </div>
        <p>We'll review your ticket and get back to you as soon as possible.${
          viewUrl
            ? " Use the button below to view its status and reply at any time — no account needed."
            : " You can track the status of your ticket by logging into your account."
        }</p>
        ${ticketLinkButton(viewUrl, "View Your Ticket")}
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `,
  }),

  ticketStatusChanged: (
    ticketNumber: string,
    title: string,
    oldStatus: string,
    newStatus: string,
    message?: string,
    viewUrl?: string
  ) => ({
    subject: `Ticket Status Updated: ${ticketNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Ticket Status Updated</h2>
        <p>The status of your support ticket has been updated.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Ticket Number:</strong> ${escapeHtml(ticketNumber)}</p>
          <p style="margin: 5px 0;"><strong>Title:</strong> ${escapeHtml(title)}</p>
          <p style="margin: 5px 0;"><strong>Previous Status:</strong> ${escapeHtml(oldStatus)}</p>
          <p style="margin: 5px 0;"><strong>New Status:</strong> <span style="color: #0070f3;">${escapeHtml(newStatus)}</span></p>
        </div>
        ${
          message
            ? `
        <div style="background-color: #f0f9ff; border-left: 4px solid #0070f3; padding: 15px; margin: 20px 0;">
          <p style="margin: 0 0 5px 0; font-weight: bold; color: #0070f3;">Message from Support:</p>
          <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
        </div>
        `
            : ""
        }
        ${ticketLinkButton(viewUrl, "View Your Ticket")}
        <p>${
          viewUrl
            ? "Use the button above to view the latest details and reply."
            : "You can view your ticket details by logging into your account."
        }</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `,
  }),

  newComment: (
    ticketNumber: string,
    title: string,
    commenterName: string,
    commentContent: string,
    viewUrl?: string
  ) => ({
    subject: `New Comment on Ticket: ${ticketNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Comment on Your Ticket</h2>
        <p>${escapeHtml(commenterName)} has added a new comment to your support ticket.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Ticket Number:</strong> ${escapeHtml(ticketNumber)}</p>
          <p style="margin: 5px 0;"><strong>Title:</strong> ${escapeHtml(title)}</p>
        </div>
        <div style="background-color: #f0f9ff; border-left: 4px solid #0070f3; padding: 15px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #0070f3;">Comment from ${escapeHtml(commenterName)}:</p>
          <p style="margin: 0; white-space: pre-wrap; color: #333;">${escapeHtml(commentContent)}</p>
        </div>
        ${ticketLinkButton(viewUrl, "View & Reply")}
        <p>${
          viewUrl
            ? "Use the button above to view the conversation and reply — no account needed."
            : "You can log in to your account to respond to this comment."
        }</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `,
  }),

  ticketAssigned: (
    ticketNumber: string,
    title: string,
    assigneeName: string,
    ticketUrl?: string
  ) => ({
    subject: `Ticket Assigned: ${ticketNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Ticket Assigned</h2>
        <p>A support ticket has been assigned to you.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Ticket Number:</strong> ${escapeHtml(ticketNumber)}</p>
          <p style="margin: 5px 0;"><strong>Title:</strong> ${escapeHtml(title)}</p>
          <p style="margin: 5px 0;"><strong>Assigned To:</strong> ${escapeHtml(assigneeName)}</p>
        </div>
        ${
          ticketUrl
            ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${escapeHtml(ticketUrl)}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Ticket</a>
        </div>
        `
            : ""
        }
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `,
  }),

  meetingScheduled: (
    ticketNumber: string,
    title: string,
    meetingTitle: string,
    scheduledAt: string,
    duration: number,
    platform: string,
    meetingLink?: string,
    timezone?: string,
    description?: string
  ) => ({
    subject: `Meeting Scheduled for Ticket: ${ticketNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Meeting Scheduled for Your Support Ticket</h2>
        <p>A meeting has been scheduled to discuss your support ticket.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Ticket Number:</strong> ${escapeHtml(ticketNumber)}</p>
          <p style="margin: 5px 0;"><strong>Ticket Title:</strong> ${escapeHtml(title)}</p>
        </div>
        <div style="background-color: #f0f9ff; border-left: 4px solid #9333ea; padding: 15px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #9333ea;">Meeting Details</h3>
          <p style="margin: 5px 0;"><strong>Meeting Title:</strong> ${escapeHtml(meetingTitle)}</p>
          <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${escapeHtml(scheduledAt)}</p>
          <p style="margin: 5px 0;"><strong>Duration:</strong> ${escapeHtml(duration)} minutes</p>
          <p style="margin: 5px 0;"><strong>Platform:</strong> ${
            platform === "zoom" ? "Zoom" : "Google Meet"
          }</p>
          ${
            timezone
              ? `<p style="margin: 5px 0;"><strong>Timezone:</strong> ${escapeHtml(timezone)}</p>`
              : ""
          }
          ${
            description
              ? `<p style="margin: 10px 0 5px 0;"><strong>Description:</strong></p><p style="margin: 5px 0; white-space: pre-wrap;">${escapeHtml(description)}</p>`
              : ""
          }
        </div>
        ${
          meetingLink
            ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${escapeHtml(meetingLink)}" style="display: inline-block; background-color: #9333ea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Join Meeting</a>
        </div>
        <p style="text-align: center; color: #666; font-size: 14px;">
          Meeting Link: <a href="${escapeHtml(meetingLink)}" style="color: #9333ea;">${escapeHtml(meetingLink)}</a>
        </p>
        `
            : ""
        }
        <p>Please make sure to join the meeting at the scheduled time. You can view more details by logging into your account.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `,
  }),

  meetingUpdated: (
    ticketNumber: string,
    title: string,
    meetingTitle: string,
    updatedFields: Record<string, string | number>,
    meetingLink?: string
  ) => ({
    subject: `Meeting Updated for Ticket: ${ticketNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Meeting Details Updated</h2>
        <p>The meeting associated with your support ticket has been updated.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Ticket Number:</strong> ${escapeHtml(ticketNumber)}</p>
          <p style="margin: 5px 0;"><strong>Ticket Title:</strong> ${escapeHtml(title)}</p>
          <p style="margin: 5px 0;"><strong>Meeting Title:</strong> ${escapeHtml(meetingTitle)}</p>
        </div>
        <div style="background-color: #f0f9ff; border-left: 4px solid #0070f3; padding: 15px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #0070f3;">Updated Fields</h3>
          ${Object.entries(updatedFields)
            .map(
              ([key, value]) =>
                `<p style="margin: 5px 0;"><strong>${escapeHtml(key)}:</strong> ${escapeHtml(
                  value
                )}</p>`
            )
            .join("")}
        </div>
        ${
          meetingLink
            ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${escapeHtml(meetingLink)}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Open Meeting</a>
        </div>
        `
            : ""
        }
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `,
  }),

  attachmentUploaded: (
    ticketNumber: string,
    title: string,
    uploaderName: string,
    filename: string,
    ticketUrl: string
  ) => ({
    subject: `Attachment Uploaded: ${filename} on Ticket ${ticketNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Attachment Uploaded</h2>
        <p>${escapeHtml(uploaderName)} uploaded a new attachment to your support ticket.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Ticket Number:</strong> ${escapeHtml(ticketNumber)}</p>
          <p style="margin: 5px 0;"><strong>Title:</strong> ${escapeHtml(title)}</p>
          <p style="margin: 5px 0;"><strong>File:</strong> ${escapeHtml(filename)}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${escapeHtml(ticketUrl)}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Ticket</a>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `,
  }),

  // Admin notification for new ticket
  adminNewTicketNotification: (
    ticketNumber: string,
    title: string,
    description: string,
    customerName: string,
    customerEmail: string,
    customerCountry: string | undefined,
    priority: string,
    category: string,
    productName: string | undefined,
    productVersion: string | undefined,
    purchaseCode: string | undefined,
    createdAt: string,
    ticketUrl: string
  ) => ({
    subject: `🎫 New Support Ticket: ${ticketNumber} - ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎫 New Support Ticket Created</h1>
        </div>

        <!-- Content -->
        <div style="padding: 30px; background-color: #f9fafb;">
          <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
            A new support ticket has been submitted and requires your attention.
          </p>

          <!-- Ticket Information -->
          <div style="background-color: #ffffff; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color: #667eea; margin: 0 0 15px 0; font-size: 18px;">Ticket Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 140px;">Ticket Number:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: bold;">${escapeHtml(ticketNumber)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Title:</td>
                <td style="padding: 8px 0; color: #111827;">${escapeHtml(title)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Priority:</td>
                <td style="padding: 8px 0;">
                  <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; ${
                    priority === "urgent"
                      ? "background-color: #fee2e2; color: #991b1b;"
                      : priority === "high"
                      ? "background-color: #fed7aa; color: #9a3412;"
                      : priority === "medium"
                      ? "background-color: #fef3c7; color: #92400e;"
                      : "background-color: #dbeafe; color: #1e40af;"
                  }">
                    ${escapeHtml(priority.toUpperCase())}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Category:</td>
                <td style="padding: 8px 0; color: #111827;">${escapeHtml(category
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase()))}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Created:</td>
                <td style="padding: 8px 0; color: #111827;">${escapeHtml(createdAt)}</td>
              </tr>
            </table>
          </div>

          <!-- Customer Information -->
          <div style="background-color: #ffffff; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color: #10b981; margin: 0 0 15px 0; font-size: 18px;">Customer Information</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 140px;">Name:</td>
                <td style="padding: 8px 0; color: #111827;">${escapeHtml(customerName)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Email:</td>
                <td style="padding: 8px 0;"><a href="mailto:${escapeHtml(customerEmail)}" style="color: #667eea; text-decoration: none;">${escapeHtml(customerEmail)}</a></td>
              </tr>
              ${
                customerCountry
                  ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Country:</td>
                <td style="padding: 8px 0; color: #111827;">${escapeHtml(customerCountry)}</td>
              </tr>
              `
                  : ""
              }
            </table>
          </div>

          ${
            productName || productVersion || purchaseCode
              ? `
          <!-- Product Information -->
          <div style="background-color: #ffffff; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color: #f59e0b; margin: 0 0 15px 0; font-size: 18px;">Product Information</h2>
            <table style="width: 100%; border-collapse: collapse;">
              ${
                productName
                  ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 140px;">Product:</td>
                <td style="padding: 8px 0; color: #111827;">${escapeHtml(productName)}</td>
              </tr>
              `
                  : ""
              }
              ${
                productVersion
                  ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Version:</td>
                <td style="padding: 8px 0; color: #111827;">${escapeHtml(productVersion)}</td>
              </tr>
              `
                  : ""
              }
              ${
                purchaseCode
                  ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Purchase Code:</td>
                <td style="padding: 8px 0; color: #111827; font-family: monospace; font-size: 12px;">${escapeHtml(purchaseCode)}</td>
              </tr>
              `
                  : ""
              }
            </table>
          </div>
          `
              : ""
          }

          <!-- Description -->
          <div style="background-color: #ffffff; border-left: 4px solid #8b5cf6; padding: 20px; margin: 20px 0; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color: #8b5cf6; margin: 0 0 15px 0; font-size: 18px;">Description</h2>
            <div style="color: #374151; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(description)}</div>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${escapeHtml(ticketUrl)}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
              View Ticket
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px;">
            Click the button above to view and respond to this ticket in the admin panel.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            This is an automated notification from your support ticket system.
          </p>
          <p style="color: #9ca3af; font-size: 11px; margin: 10px 0 0 0;">
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
  }),
};
