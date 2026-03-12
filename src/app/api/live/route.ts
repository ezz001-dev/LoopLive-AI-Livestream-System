import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  try {
    const { title, video_id, context_text, ai_tone, youtube_video_id, target_rtmp_url, stream_key } = await req.json();

    if (!title || !video_id) {
        return NextResponse.json({ error: "Missing required fields: title and video_id are required" }, { status: 400 });
    }

    const newSession = await (prisma.live_sessions as any).create({
        data: {
            title,
            video_id,
            context_text: context_text || "",
            ai_tone: ai_tone || "friendly",
            status: "IDLE",
            viewer_count: 0,
            youtube_video_id: youtube_video_id || null,
            target_rtmp_url: target_rtmp_url || null,
            stream_key: stream_key || null,
        }
    });



    return NextResponse.json({ live_id: newSession.id });

  } catch (error) {
    console.error("Create Live Session Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
