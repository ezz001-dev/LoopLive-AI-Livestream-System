import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantScopedLiveSession } from "@/lib/tenant-context";
import Redis from "ioredis";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const redisPub = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

/**
 * PATCH /api/live/[id]/youtube-id
 * 
 * Updates the YouTube Video ID for a live session and restarts the chat poller.
 * Can be called while the stream is LIVE to switch to a new YouTube video ID.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const body = await req.json();
        const { youtube_video_id } = body;

        if (!youtube_video_id || typeof youtube_video_id !== 'string') {
            return NextResponse.json({ error: "youtube_video_id is required" }, { status: 400 });
        }

        // Clean the video ID (handle full URLs)
        let cleanVideoId = youtube_video_id.trim();
        
        // Extract video ID from full YouTube URL if provided
        const urlPatterns = [
            /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
            /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
        ];
        
        for (const pattern of urlPatterns) {
            const match = cleanVideoId.match(pattern);
            if (match) {
                cleanVideoId = match[1];
                break;
            }
        }

        const session = await getTenantScopedLiveSession(id);

        if (!session) {
            return NextResponse.json({ error: "Live session not found" }, { status: 404 });
        }

        const oldVideoId = session.youtube_video_id;

        // Update the video ID in database
        await prisma.live_sessions.update({
            where: { id },
            data: { youtube_video_id: cleanVideoId }
        });

        // If session is LIVE, restart the YouTube chat poller with new video ID
        if (session.status === "LIVE") {
            // Stop old poller
            if (oldVideoId) {
                await redisPub.publish("youtube_poll_control", JSON.stringify({
                    type: "STOP_POLL",
                    liveSessionId: id
                }));
                console.log(`[YouTube ID Update] Stopped old poller for video: ${oldVideoId}`);
            }

            // Small delay to ensure stop is processed
            await new Promise(resolve => setTimeout(resolve, 500));

            // Start new poller
            await redisPub.publish("youtube_poll_control", JSON.stringify({
                type: "START_POLL",
                liveSessionId: id,
                youtubeVideoId: cleanVideoId
            }));
            console.log(`[YouTube ID Update] Started new poller for video: ${cleanVideoId}`);
        }

        console.log(`[YouTube ID Update] Session ${id}: ${oldVideoId} → ${cleanVideoId}`);

        return NextResponse.json({
            success: true,
            youtube_video_id: cleanVideoId,
            poller_restarted: session.status === "LIVE"
        });

    } catch (error: any) {
        console.error("Update YouTube Video ID Error:", error);
        return NextResponse.json({ error: `Failed to update: ${error.message}` }, { status: 500 });
    }
}
