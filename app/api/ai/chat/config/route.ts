import { NextResponse } from "next/server";
import { getChatbotPublicConfig } from "@/actions/ai-chat";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getChatbotPublicConfig();
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ enabled: false }, { status: 200 });
  }
}
