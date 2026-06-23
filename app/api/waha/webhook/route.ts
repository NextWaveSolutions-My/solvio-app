import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import {
  createConversationRecord,
  createMessageRecord,
} from "@/lib/chat/server";

export const dynamic = "force-dynamic";

function cleanPhone(chatId: string) {
  return chatId.replace("@c.us", "").replace("@s.whatsapp.net", "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("WAHA WEBHOOK RECEIVED:", JSON.stringify(body, null, 2));

    const payload = body.payload || body;
    const from = payload.from || payload.chatId;
    const text = payload.body || payload.text || payload.message?.text;

    if (!from || !text) {
      return NextResponse.json({ success: true, skipped: "No message text" });
    }

    const phone = cleanPhone(from);
    const whatsappUserId = `wa_${phone}`;
    const adminUserId = process.env.WAHA_DEFAULT_ADMIN_ID;

    if (!adminUserId) {
      return NextResponse.json(
        { error: "Missing WAHA_DEFAULT_ADMIN_ID in .env" },
        { status: 500 }
      );
    }

    const usersCollection = await getCollection("user");

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

    const conversationsCollection = await getCollection("conversations");

    let conversation = await conversationsCollection.findOne({
      participantIds: { $all: [adminUserId, whatsappUserId] },
    });

    if (!conversation) {
      conversation = await createConversationRecord({
        participantIds: [adminUserId, whatsappUserId],
        createdBy: whatsappUserId,
      });
    }

    await createMessageRecord({
      conversationId: conversation.id,
      senderId: whatsappUserId,
      senderName: phone,
      content: text,
    });

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
