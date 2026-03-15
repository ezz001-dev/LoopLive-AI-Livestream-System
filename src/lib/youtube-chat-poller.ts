import { Masterchat } from "masterchat";
import Redis from "ioredis";
import { prisma } from "./prisma";
import { getLiveSessionTenantId } from "./tenant-context";
import * as dotenv from "dotenv";

dotenv.config();

async function initRedis() {
  const settings = await prisma.system_settings.findUnique({ where: { id: "1" } });
  const redisUrl = settings?.redis_url || process.env.REDIS_URL || "redis://localhost:6379";
  return new Redis(redisUrl);
}

const activePollers = new Map<string, Masterchat>();
let redisPub: Redis;
let redisSub: Redis;

async function startWorker() {
  redisPub = await initRedis();
  redisSub = await initRedis();

  console.log("[YouTube-Poller] YouTube Chat Poller Worker started (Tenant Aware).");

  redisSub.subscribe("youtube_poll_control", (err) => {
    if (err) console.error("[YouTube-Poller] Subscribe error:", err);
  });

  redisSub.on("message", async (channel, message) => {
    if (channel !== "youtube_poll_control") return;
    try {
      const cmd = JSON.parse(message);
      if (cmd.type === "START_POLL") {
        await startPoller(cmd.liveSessionId, cmd.youtubeVideoId);
      } else if (cmd.type === "STOP_POLL") {
        await stopPoller(cmd.liveSessionId);
      }
    } catch (e: any) {
      console.error("[YouTube-Poller] Command parse error:", e.message);
    }
  });
}

startWorker();

async function getTenantSettings(tenantId: string) {
    return (prisma as any).tenant_settings.findUnique({
        where: { tenant_id: tenantId }
    });
}

async function startPoller(liveSessionId: string, youtubeVideoId: string) {
    if (activePollers.has(liveSessionId)) return;

    const tenantId = await getLiveSessionTenantId(liveSessionId);
    if (!tenantId) {
        console.error(`[YouTube-Poller] No tenant found for session ${liveSessionId}`);
        return;
    }

    console.log(`[YouTube-Poller][Tenant:${tenantId}] Starting poller for YouTube ID: ${youtubeVideoId}`);

    try {
        const tSettings = await getTenantSettings(tenantId);
        const ytCookie = tSettings?.yt_cookie || process.env.YT_COOKIE;
        const cleanCookie = ytCookie ? ytCookie.trim() : undefined;

        const mc = await Masterchat.init(youtubeVideoId, { mode: "live" });
        activePollers.set(liveSessionId, mc);

        mc.on("chat", async (chat: any) => {
            let messageText = "";
            if (chat.message && Array.isArray(chat.message)) {
                messageText = chat.message.map((part: any) => part.text || "").join("");
            } else if (chat.displayText) {
                messageText = chat.displayText;
            }

            if (!messageText || messageText.trim() === "") return;

            const authorName = chat.authorName || "Anonymous";
            if (chat.isModerator && authorName.toLowerCase().includes("bot")) return;

            try {
                const saved = await prisma.chat_logs.create({
                    data: {
                        live_session_id: liveSessionId,
                        viewer_id: authorName,
                        message: messageText,
                    }
                });

                await redisPub.publish("chat_event_queue", JSON.stringify({
                    type: "NEW_CHAT",
                    liveId: liveSessionId,
                    chatId: saved.id,
                    message: messageText,
                    viewerId: authorName,
                    source: "youtube"
                }));

                await redisPub.publish("chat_broadcast", JSON.stringify({
                    id: saved.id,
                    liveId: liveSessionId,
                    viewerId: authorName,
                    message: messageText,
                    createdAt: saved.created_at,
                    source: "youtube"
                }));
            } catch (err: any) {
                console.error("[YouTube-Poller] DB/Redis error:", err.message);
            }
        });

        mc.on("end", () => {
            activePollers.delete(liveSessionId);
        });

        mc.on("error", (err) => {
            console.error(`[YouTube-Poller] Error for ${youtubeVideoId}:`, err.message);
            if (err.message.includes("Chat is disabled") || err.message.includes("invalid argument")) {
                setTimeout(() => startPoller(liveSessionId, youtubeVideoId), 10000);
            } else {
                activePollers.delete(liveSessionId);
            }
        });

        mc.listen();
    } catch (e: any) {
        console.error(`[YouTube-Poller] Failed to init for ${youtubeVideoId}:`, e.message);
        setTimeout(() => startPoller(liveSessionId, youtubeVideoId), 10000);
    }
}

async function stopPoller(liveSessionId: string) {
    const mc = activePollers.get(liveSessionId);
    if (mc) {
        mc.stop();
        activePollers.delete(liveSessionId);
    }
}

process.on("SIGINT", async () => {
    for (const mc of activePollers.values()) mc.stop();
    process.exit(0);
});
