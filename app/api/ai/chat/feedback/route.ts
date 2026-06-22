import { NextResponse } from "next/server";
import { submitChatFeedback } from "@/actions/ai-chat";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const result = await submitChatFeedback(body);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
