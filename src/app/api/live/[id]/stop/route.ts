import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { workerManager } from "@/lib/worker-manager";
import { clearAudioQueue } from "@/lib/audio-event-manager";
import { getTenantScopedLiveSession } from "@/lib/tenant-context";
import Redis from "ioredis";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Redis is initialized per-request
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    const id = (await params).id;

    const settings = await prisma.system_settings.findUnique({ where: { id: "1" } });
    const redisUrl = settings?.redis_url || process.env.REDIS_URL || "redis://localhost:6379";
    const redisPub = new Redis(redisUrl);

    const session = await getTenantScopedLiveSession(id);

    if (!session) {
        return NextResponse.json({ error: "Live session not found" }, { status: 404 });
    }

    // Update database status to STOPPED
    await prisma.live_sessions.update({
        where: { id },
        data: { status: "STOPPED", viewer_count: 0 }
    });

    // Stop FFmpeg Loop Worker
    workerManager.stop(id);
    await clearAudioQueue(id);

    // Stop YouTube Chat Poller via Redis
    await redisPub.publish("youtube_poll_control", JSON.stringify({
        type: "STOP_POLL",
        liveSessionId: id
    }));

    console.log(`[Worker System] Stopping Loop Worker / Live session: ${id}`);

    return NextResponse.json({ status: "STOPPED" });

  } catch (error) {
    console.error("Stop Live Session Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
