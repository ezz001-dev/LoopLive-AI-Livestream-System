import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { workerManager } from "@/lib/worker-manager";
import Redis from "ioredis";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const redisPub = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
  try {
    const id = (await params).id;

    const session = await prisma.live_sessions.findUnique({ where: { id } });

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
