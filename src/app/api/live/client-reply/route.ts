import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-session";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { liveId, chatId, prompt, reply, provider } = await req.json();

    if (!liveId || !reply) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Verify tenant owns the session
    const liveSession = await (prisma.live_sessions as any).findUnique({
      where: { id: liveId, tenant_id: session.tenantId },
    });

    if (!liveSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // 2. Log AI Reply
    const aiReply = await (prisma.ai_reply_logs as any).create({
      data: {
        live_session_id: liveId,
        chat_id: chatId,
        prompt: prompt,
        reply: reply,
      }
    });

    // 3. Broadcast Reply to Chat
    await redis.publish("chat_broadcast", JSON.stringify({
      id: aiReply.id,
      liveId,
      viewerId: "AI_ASSISTANT",
      message: reply,
      createdAt: aiReply.created_at
    }));

    // Record Usage for analytics (even though limits bypassed)
    try {
      const { recordUsage } = await import("@/lib/usage");
      await recordUsage(session.tenantId as string, "ai_responses", 1, {
        replyId: aiReply.id,
        provider: provider || "client_side",
        liveId: liveId,
        byok: true
      });
    } catch (usageError) {
      console.error("[Client Reply API] Usage tracking error:", usageError);
    }

    // 4. Trigger TTS (The server-side TTS worker can still handle this using system keys IF BYOK is only for AI, 
    // but usually BYOK follows through. For now, we'll trigger the standard voice play event).
    // The client can also choose to do TTS locally, but broadcasting is safer for sync.
    
    await redis.publish("ai_voice_play", JSON.stringify({
        liveId,
        tenantId: session.tenantId,
        text: reply,
        replyId: aiReply.id
    }));

    return NextResponse.json({ success: true, replyId: aiReply.id });
  } catch (error: any) {
    console.error("[Client Reply API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
