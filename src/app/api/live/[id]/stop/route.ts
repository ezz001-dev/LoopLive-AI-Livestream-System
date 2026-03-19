import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { workerManager } from "@/lib/worker-manager";
import { getTenantScopedLiveSession, getLiveSessionTenantId } from "@/lib/tenant-context";
import { logAudit } from "@/lib/audit";
import { getAuthSession } from "@/lib/auth-session";
import { recordUsage } from "@/lib/usage";
import Redis from "ioredis";

export const dynamic = "force-dynamic";

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
        if (schedulerKey && schedulerKey === systemSettings?.scheduler_api_key) {
            const tenantId = await getLiveSessionTenantId(id);
            if (!tenantId) {
                return NextResponse.json({ error: "Live session has no tenant association" }, { status: 400 });
            }
            session = await getTenantScopedLiveSession(id, { include: { video: true } }, tenantId);
        } else {
            session = await getTenantScopedLiveSession(id, { include: { video: true } });
        }

        if (!session) {
            return NextResponse.json({ error: "Live session not found or access denied" }, { status: 404 });
        }

        // 1. Update status to IDLE and capture previous LIVE start time
        const prevSession = await prisma.live_sessions.findUnique({ where: { id }, select: { updated_at: true } });
        await prisma.live_sessions.update({
            where: { id },
            data: { status: "IDLE" }
        });

        // Record stream minutes
        const tenantId = await getLiveSessionTenantId(id);
        if (prevSession?.updated_at) {
            const streamMinutes = (Date.now() - new Date(prevSession.updated_at).getTime()) / 60000;
            if (streamMinutes > 0 && tenantId) {
                await recordUsage(tenantId, "stream_minutes", streamMinutes, {
                    sessionId: id,
                    sessionTitle: session.title,
                });
            }
        }

        // --- Audit Log ---
        const authSession = await getAuthSession();
        await logAudit({
            tenantId: tenantId || undefined,
            actorUserId: authSession?.userId,
            actorType: schedulerKey ? "system" : "user",
            action: "STOP_STREAM",
            targetType: "live_session",
            targetId: id,
            metadata: {
                triggeredBy: schedulerKey ? "scheduler" : "manual",
                sessionTitle: session.title
            }
        });

        // 2. Stop worker
        try {
            workerManager.stop(id);
        } catch (err: any) {
            console.warn(`[Stop API] Worker for ${id} was not running or failed to stop:`, err.message);
        }

        // 3. Stop YouTube Chat Poller if Video ID exists
        if (session.youtube_video_id) {
            await redisPub.publish("youtube_poll_control", JSON.stringify({
                type: "STOP_POLL",
                liveSessionId: id,
                youtubeVideoId: session.youtube_video_id
            }));
            console.log(`[Stop API] YouTube Chat Poller stopped for video: ${session.youtube_video_id}`);
        }

        console.log(`[Worker System] Loop Worker stopped for session: ${id}`);
        return NextResponse.json({ status: "IDLE" });

    } catch (error) {
        console.error("Stop Live Session Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
