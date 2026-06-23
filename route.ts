import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import {
  createMessageRecord,
  findOrCreateDirectConversation,
  getMessageForConversationUser,
} from "@/lib/chat/server";
import {
  emitConversationSummaryToParticipants,
  emitMessageCreated,
} from "@/lib/socket/server";
import type { User } from "@/types";

export const dynamic = "force-dynamic";

function cleanPhone(chatId: string) {
  return chatId.replace("@c.us", "").replace("@s.whatsapp.net", "");
}

/**
 * Verify this request actually came from your WAHA instance.
 *
 * WAHA lets you set a custom header on outgoing webhooks (Settings →
 * Webhooks → Custom Headers in the WAHA dashboard, or `webhooks[].customHeaders`
 * in the session config). Set a header there named `X-Webhook-Secret` with
 * the same value as WAHA_WEBHOOK_SECRET below, and anyone who finds this URL
 * without that header gets rejected instead of being able to inject fake
 * "customer" messages into your inbox.
 *
 * If WAHA_WEBHOOK_SECRET isn't set, verification is skipped (useful for
 * local testing) — but you should set it before going live.
 */
function isAuthorizedWebhookRequest(req: NextRequest) {
  const expected = process.env.WAHA_WEBHOOK_SECRET;
  if (!expected) {
    return true;
  }

  return req.headers.get("x-webhook-secret") === expected;
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorizedWebhookRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const payload = body.payload || body;
    const from = payload.from || payload.chatId;
    const text = payload.body || payload.text || payload.message?.text;

    // WAHA also fires non-message events on this same webhook (session
    // status changes, message ACKs, etc) if you've subscribed to more than
    // "message" events in WAHA's config. Those won't have `from`/text, so we
    // skip them quietly instead of treating them as errors.
    if (!from || !text) {
      return NextResponse.json({ success: true, skipped: "No message text" });
    }

    // Ignore messages WAHA echoes back that were sent BY this number (e.g.
    // your own outgoing replies, or messages sent from the phone itself).
    // Without this check, your own replies could loop back in as if the
    // customer sent them.
    if (payload.fromMe === true) {
      return NextResponse.json({ success: true, skipped: "Outgoing echo" });
    }

    const phone = cleanPhone(from);
    const whatsappUserId = `wa_${phone}`;
    const adminUserId = process.env.WAHA_DEFAULT_ADMIN_ID;

    if (!adminUserId) {
      console.error("[WAHA webhook] Missing WAHA_DEFAULT_ADMIN_ID in .env");
      return NextResponse.json(
        { error: "Missing WAHA_DEFAULT_ADMIN_ID in .env" },
        { status: 500 }
      );
    }

    const usersCollection = await getCollection<User>("user");

    await usersCollection.updateOne(
      { id: whatsappUserId },
      {
        $setOnInsert: {
          id: whatsappUserId,
          name: phone,
          email: `${phone}@whatsapp.local`,
          role: "customer",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    const conversation = await findOrCreateDirectConversation(
      adminUserId,
      whatsappUserId
    );

    const messageDoc = await createMessageRecord({
      conversationId: conversation.id,
      senderId: whatsappUserId,
      senderName: phone,
      content: text,
    });

    // This is the part that was missing before: actually push the new
    // message live to anyone with the conversation open, and refresh the
    // conversation list (so the inbox re-sorts and shows the unread badge)
    // for every participant. Without these two calls, the message only
    // existed in MongoDB — nobody's dashboard would update until a manual
    // page reload.
    const message = await getMessageForConversationUser(
      messageDoc.id,
      adminUserId
    );

    if (message) {
      emitMessageCreated(message);
    }

    await emitConversationSummaryToParticipants(conversation.id);

    return NextResponse.json({
      success: true,
      phone,
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error("WAHA webhook error:", error);
    return NextResponse.json(
      { error: "WAHA webhook failed" },
      { status: 500 }
    );
  }
}

