import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// In Next.js App Router API, we need to export async function based on HTTP Verb
// with the second argument typing the dynamic route segment params.
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    const id = (await params).id;

    const session = await prisma.live_sessions.findUnique({
        where: { id: id },
        select: {
            status: true,
            viewer_count: true
        }
    });

    if (!session) {
        return NextResponse.json({ error: "Live session not found" }, { status: 404 });
    }

    return NextResponse.json({
        status: session.status,
        viewer_count: session.viewer_count
    });

  } catch (error) {
    console.error("Get Live Session Status Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    const id = (await params).id;

    // Optional: Stop worker if running?
    // For now just delete from DB. Cascade will handle logs.
    await prisma.live_sessions.delete({
        where: { id: id }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Delete Live Session Error:", error);
    return NextResponse.json({ error: `Failed to delete session: ${error.message}` }, { status: 500 });
  }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    const id = (await params).id;
    const body = await req.json();

    // Fields that can be updated
    const allowedUpdates = [
        "title",
        "youtube_video_id",
        "youtube_channel_id", 
        "target_rtmp_url",
        "stream_key",
        "context_text",
        "ai_tone",
        // Schedule fields
        "schedule_enabled",
        "schedule_type",
        "schedule_start_at",
        "schedule_end_at",
        "schedule_days",
        "schedule_start_time",
        "schedule_end_time",
        "schedule_timezone",
        "schedule_repeat_end"
    ];

    // Filter to only allowed fields
    const updateData: any = {};
    for (const key of allowedUpdates) {
        if (body[key] !== undefined) {
            // Handle schedule_days - convert array to JSON string
            if (key === "schedule_days" && Array.isArray(body[key])) {
                updateData[key] = JSON.stringify(body[key]);
            }
            // Handle DateTime fields
            else if (["schedule_start_at", "schedule_end_at", "schedule_repeat_end"].includes(key)) {
                updateData[key] = body[key] ? new Date(body[key]) : null;
            }
            else {
                updateData[key] = body[key];
            }
        }
    }

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const session = await prisma.live_sessions.update({
        where: { id: id },
        data: updateData
    });

    return NextResponse.json({ 
        success: true, 
        session: {
            id: session.id,
            title: session.title,
            youtube_video_id: session.youtube_video_id,
            youtube_channel_id: session.youtube_channel_id,
            target_rtmp_url: session.target_rtmp_url,
            stream_key: session.stream_key,
            context_text: session.context_text,
            ai_tone: session.ai_tone,
            status: session.status
        }
    });

  } catch (error: any) {
    console.error("Update Live Session Error:", error);
    return NextResponse.json({ error: `Failed to update session: ${error.message}` }, { status: 500 });
  }
}

