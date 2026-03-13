import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { workerManager } from "@/lib/worker-manager";
import { getYouTubeLiveVideoId } from "@/lib/youtube-detect";
import Redis from "ioredis";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Redis is initialized per-request to use dynamic settings

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;

        const settings = await prisma.system_settings.findUnique({ where: { id: "1" } });
        const redisUrl = settings?.redis_url || process.env.REDIS_URL || "redis://localhost:6379";
        const redisPub = new Redis(redisUrl);

        const session: any = await prisma.live_sessions.findUnique({ where: { id } });

        if (!session) {
            return NextResponse.json({ error: "Live session not found" }, { status: 404 });
        }

        if (session.status === "LIVE") {
            return NextResponse.json({ error: "Stream is already live" }, { status: 400 });
        }

        // Update status to LIVE
        await prisma.live_sessions.update({
            where: { id },
            data: { status: "LIVE" }
        });

        // Start FFmpeg Loop Worker
        const videoFilename = session.video_id.includes(".") ? session.video_id : `${session.video_id}.mp4`;

        // Construct RTMP Destination
        // If target_rtmp_url is provided (e.g. YouTube), use it. Otherwise use internal MediaMTX.
        let rtmpUrl = `rtmp://localhost:1935/live/${id}`;
        if (session.target_rtmp_url) {
            let baseUrl = session.target_rtmp_url;
            // Ensure trailing slash if not present
            if (!baseUrl.endsWith("/")) baseUrl += "/";
            rtmpUrl = `${baseUrl}${session.stream_key || ""}`;
            console.log(`[Start API] Using external RTMP destination: ${rtmpUrl.split(session.stream_key || "SECRET")[0]}***`);
        } else {
            console.log(`[Start API] Using internal RTMP destination (MediaMTX): ${rtmpUrl}`);
        }

        try {
            workerManager.start(id, videoFilename, rtmpUrl);
        } catch (err: any) {
            console.error("[WorkerManager] Failed to start:", err);

            await prisma.live_sessions.update({ where: { id }, data: { status: "IDLE" } });
            return NextResponse.json({ error: `Failed to start stream worker: ${err.message}` }, { status: 500 });
        }

        // Start YouTube Chat Poller
        // Priority: 1) session.youtube_video_id (manual), 2) Auto-detect from settings in DB
        let youtubeVideoId = session.youtube_video_id || null;

        if (!youtubeVideoId) {
            const settings = await prisma.system_settings.findUnique({ where: { id: "1" } });
            const ytHandle = settings?.yt_channel_handle;

            if (ytHandle) {
                console.log(`[Start API] No Video ID on session — auto-detecting from channel: ${ytHandle}`);
                youtubeVideoId = await getYouTubeLiveVideoId(ytHandle);

                // Save the detected video ID to session so stop/other features can use it
                if (youtubeVideoId) {
                    await prisma.live_sessions.update({
                        where: { id },
                        data: { youtube_video_id: youtubeVideoId }
                    });
                    console.log(`[Start API] Auto-detected and saved Video ID: ${youtubeVideoId}`);
                }
            }
        }

        if (youtubeVideoId) {
            await redisPub.publish("youtube_poll_control", JSON.stringify({
                type: "START_POLL",
                liveSessionId: id,
                youtubeVideoId
            }));
            console.log(`[Start API] YouTube Chat Poller started for video: ${youtubeVideoId}`);
        } else {
            console.log(`[Start API] No YouTube Video ID available — skipping YouTube chat polling.`);
        }

        console.log(`[Worker System] Loop Worker started for session: ${id}`);
        return NextResponse.json({ status: "LIVE" });

    } catch (error) {
        console.error("Start Live Session Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
