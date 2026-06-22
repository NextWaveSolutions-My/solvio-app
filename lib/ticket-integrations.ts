import { getSystemSettings } from "@/lib/settings-utils";
import type { RequestKind } from "@/lib/request-utils";
import type { Ticket, UserRole } from "@/types";

type NewTicketIntegrationPayload = {
  ticket: Ticket;
  kind: RequestKind;
  actorName: string;
  actorRole: UserRole;
  customerName: string;
  customerEmail?: string;
  customerCountry?: string;
  adminUrl: string;
  dashboardUrl?: string;
};

function formatLabel(value?: string) {
  const normalized = (value || "").trim();
  if (!normalized) return "Unknown";

  return normalized
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getRequestLabel(kind: RequestKind, serviceSlug?: string) {
  if (kind === "installation") return "Installation Request";
  if (kind === "customization") return "Customization Request";
  if (kind === "service") return `${formatLabel(serviceSlug || "Service")} Request`;
  return "Support Ticket";
}

function getRoleLabel(role: UserRole) {
  if (role === "admin") return "Admin";
  if (role === "support") return "Support";
  return "Customer";
}

function trimText(value?: string, maxLength = 280) {
  const normalized = (value || "").trim();
  if (!normalized) return "No description provided.";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

async function postWebhook(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });

  if (response.ok) return;

  const errorText = (await response.text().catch(() => "")).trim();
  throw new Error(
    errorText
      ? `Webhook request failed (${response.status}): ${errorText.slice(0, 300)}`
      : `Webhook request failed with status ${response.status}`,
  );
}

function buildDetails(payload: NewTicketIntegrationPayload) {
  const requestLabel = getRequestLabel(payload.kind, payload.ticket.serviceSlug);
  const createdAt = payload.ticket.createdAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const details = [
    { label: "Type", value: requestLabel },
    { label: "Priority", value: formatLabel(payload.ticket.priority) },
    { label: "Category", value: formatLabel(payload.ticket.category) },
    { label: "Customer", value: payload.customerName || "Unknown" },
    { label: "Created By", value: `${payload.actorName} (${getRoleLabel(payload.actorRole)})` },
    { label: "Created At", value: createdAt },
  ];

  if (payload.customerEmail) {
    details.push({ label: "Email", value: payload.customerEmail });
  }

  if (payload.customerCountry) {
    details.push({ label: "Country", value: payload.customerCountry });
  }

  if (payload.ticket.productName) {
    details.push({ label: "Product", value: payload.ticket.productName });
  }

  if (payload.ticket.productVersion) {
    details.push({ label: "Version", value: payload.ticket.productVersion });
  }

  if (payload.ticket.purchaseCode) {
    details.push({ label: "Purchase Code", value: payload.ticket.purchaseCode });
  }

  return { requestLabel, createdAt, details };
}

function buildSlackPayload(payload: NewTicketIntegrationPayload) {
  const { requestLabel, details } = buildDetails(payload);
  const summary = trimText(payload.ticket.description);
  const detailText = details
    .map((detail) => `• *${detail.label}:* ${detail.value}`)
    .join("\n");

  return {
    text: `New ${requestLabel}: ${payload.ticket.ticketNumber} - ${payload.ticket.title}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🎫 New ${requestLabel}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${payload.ticket.ticketNumber}* — *${payload.ticket.title}*\n${summary}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: detailText,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${payload.adminUrl}|Open in admin panel>${
            payload.dashboardUrl ? ` • <${payload.dashboardUrl}|Open customer view>` : ""
          }`,
        },
      },
    ],
  };
}

function buildDiscordPayload(payload: NewTicketIntegrationPayload) {
  const { requestLabel, details } = buildDetails(payload);

  return {
    content: `🎫 New ${requestLabel}: ${payload.ticket.ticketNumber}`,
    embeds: [
      {
        title: `${payload.ticket.ticketNumber} — ${payload.ticket.title}`,
        url: payload.adminUrl,
        description: trimText(payload.ticket.description, 400),
        color: 5814783,
        fields: details.map((detail) => ({
          name: detail.label,
          value: detail.value,
          inline: detail.label !== "Created At",
        })),
        footer: {
          text: requestLabel,
        },
        timestamp: payload.ticket.createdAt.toISOString(),
      },
    ],
  };
}

export async function sendSlackTestNotification(webhookUrl: string) {
  return postWebhook(webhookUrl, {
    text: "Slack integration test successful!",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Slack Integration Test*\n\nYour ticket notification webhook is connected successfully.",
        },
      },
    ],
  });
}

export async function sendDiscordTestNotification(webhookUrl: string) {
  return postWebhook(webhookUrl, {
    content: "Discord integration test successful!",
    embeds: [
      {
        title: "Discord Integration Test",
        description:
          "Your ticket notification webhook is connected successfully.",
        color: 5793266,
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

export async function sendNewTicketIntegrationNotifications(
  payload: NewTicketIntegrationPayload,
) {
  const settings = await getSystemSettings();
  const jobs: Promise<void>[] = [];

  if (
    settings.integrations.slack.enabled &&
    settings.integrations.slack.notifyOnNewTicket &&
    settings.integrations.slack.webhookUrl
  ) {
    jobs.push(
      postWebhook(
        settings.integrations.slack.webhookUrl,
        buildSlackPayload(payload),
      ),
    );
  }

  if (
    settings.integrations.discord.enabled &&
    settings.integrations.discord.notifyOnNewTicket &&
    settings.integrations.discord.webhookUrl
  ) {
    jobs.push(
      postWebhook(
        settings.integrations.discord.webhookUrl,
        buildDiscordPayload(payload),
      ),
    );
  }

  if (!jobs.length) return;

  const results = await Promise.allSettled(jobs);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Failed to send ticket integration notification:", result.reason);
    }
  }
}
