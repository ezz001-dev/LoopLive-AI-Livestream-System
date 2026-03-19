import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { workerManager } from "@/lib/worker-manager";
import { getYouTubeLiveVideoId } from "@/lib/youtube-detect";
import { resolveVideoInputSource } from "@/lib/storage";
import { getTenantScopedLiveSession, getLiveSessionTenantId } from "@/lib/tenant-context";
import { logAudit } from "@/lib/audit";
import { getAuthSession } from "@/lib/auth-session";
import { checkPlanLimit } from "@/lib/limits";
import Redis from "ioredis";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function getTenantSettings(tenantId: string) {
    return (prisma as any).tenant_settings.findUnique({ where: { tenant_id: tenantId } });
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const schedulerKey = req.headers.get("x-scheduler-key");

        const systemSettings = await prisma.system_settings.findUnique({ where: { id: "1" } });
        const redisUrl = systemSettings?.redis_url || process.env.REDIS_URL || "redis://localhost:6379";
        const redisPub = new Redis(redisUrl);

        let session;
        let tenantId;

        if (schedulerKey && schedulerKey === systemSettings?.scheduler_api_key) {
            tenantId = await getLiveSessionTenantId(id);
            if (!tenantId) {
                return NextResponse.json({ error: "Live session has no tenant association" }, { status: 400 });
            }
            session = await getTenantScopedLiveSession(id, { include: { video: true } }, tenantId);
        } else {
            session = await getTenantScopedLiveSession(id, { include: { video: true } });
            tenantId = session?.tenant_id;
        }

        if (!session || !tenantId) {
            return NextResponse.json({ error: "Live session not found or access denied" }, { status: 404 });
        }

        if (session.status === "LIVE") {
            return NextResponse.json({ error: "Stream is already live" }, { status: 400 });
        }

        // --- Plan Limit Guard Rail ---
        const limitCheck = await checkPlanLimit(tenantId, "maxActiveStreams");
        if (!limitCheck.allowed) {
            return NextResponse.json({ error: limitCheck.message }, { status: 403 });
        }

        const tSettings = await getTenantSettings(tenantId);

        // Update status to LIVE
        await prisma.live_sessions.update({
            where: { id },
            data: { status: "LIVE" }
        });

        // --- Audit Log ---
        const authSession = await getAuthSession();
        await logAudit({
            tenantId,
            actorUserId: authSession?.userId,
            actorType: schedulerKey ? "system" : "user",
            action: "START_STREAM",
            targetType: "live_session",
            targetId: id,
            metadata: {
                triggeredBy: schedulerKey ? "scheduler" : "manual",
                videoTitle: session.video?.filename,
                rtmpTarget: session.target_rtmp_url || "internal"
            }
        });

        if (!session.video) {
            await prisma.live_sessions.update({ where: { id }, data: { status: "IDLE" } });
            return NextResponse.json({ error: "Video asset not found for this session" }, { status: 404 });
        }

        const videoSource = await resolveVideoInputSource(session.video);

        // Construct RTMP destination.
        const mediamtxHost = systemSettings?.mediamtx_host || "localhost";
        const rtmpPort = systemSettings?.rtmp_port || 1935;

        // If target_rtmp_url is provided (e.g. YouTube/TikTok), use it. Otherwise use internal MediaMTX.
        let rtmpUrl = `rtmp://${mediamtxHost}:${rtmpPort}/live/${id}`;
        if (session.target_rtmp_url) {
            let baseUrl = session.target_rtmp_url;
            if (!baseUrl.endsWith("/")) baseUrl += "/";
            rtmpUrl = `${baseUrl}${session.stream_key || ""}`;
        }

        try {
            const loopMode = (session as any).loop_mode === "count" ? "count" : "infinite";
            const loopCount = loopMode === "count" ? (session as any).loop_count : null;
            workerManager.start(id, videoSource.input, rtmpUrl, {
                loopMode,
                loopCount,
            });
        } catch (err: any) {
            console.error("[WorkerManager] Failed to start:", err);
            await prisma.live_sessions.update({ where: { id }, data: { status: "IDLE" } });
            return NextResponse.json({ error: `Failed to start stream worker: ${err.message}` }, { status: 500 });
        }

        // Start YouTube Chat Poller
        let youtubeVideoId = session.youtube_video_id || null;

        if (!youtubeVideoId) {
            const ytHandle = tSettings?.yt_channel_handle;
            if (ytHandle) {
                youtubeVideoId = await getYouTubeLiveVideoId(ytHandle);
                if (youtubeVideoId) {
                    await prisma.live_sessions.update({
                        where: { id },
                        data: { youtube_video_id: youtubeVideoId }
                    });
                }
            }
        }

        if (youtubeVideoId) {
            await redisPub.publish("youtube_poll_control", JSON.stringify({
                type: "START_POLL",
                liveSessionId: id,
                youtubeVideoId
            }));
        }

        return NextResponse.json({ status: "LIVE" });

    } catch (error) {
        console.error("Start Live Session Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
