import { NextResponse } from "next/server";
import { createGuestTicket } from "@/actions/ai-chat";
import { extractClientIp } from "@/lib/rate-limit";

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

  const ip = extractClientIp(req);
  const result = await createGuestTicket(body as any, { ip });

  if (!result.success) {
    const isRate = result.error?.startsWith("Too many");
    return NextResponse.json(result, { status: isRate ? 429 : 400 });
  }

  return NextResponse.json(result);
}
