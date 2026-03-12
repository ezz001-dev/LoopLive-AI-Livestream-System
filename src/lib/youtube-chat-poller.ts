import { Masterchat, stringify } from "masterchat";
import Redis from "ioredis";
import { prisma } from "./prisma";
import * as dotenv from "dotenv";

dotenv.config();

const redisPub = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Store active pollers: liveSessionId -> Masterchat instance
const activePollers = new Map<string, Masterchat>();

console.log("[YouTube-Poller] YouTube Chat Poller Worker started.");
console.log("[YouTube-Poller] Waiting for START_YOUTUBE_POLL commands on Redis...");

// Control channel listener
const redisSub = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
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

async function startPoller(liveSessionId: string, youtubeVideoId: string) {
    if (activePollers.has(liveSessionId)) {
        console.log(`[YouTube-Poller] Poller for session ${liveSessionId} already running.`);
        return;
    }

    console.log(`[YouTube-Poller] Starting poller for session: ${liveSessionId}, YouTube ID: ${youtubeVideoId}`);

    try {
        console.log(`[YouTube-Poller] Initializing Masterchat for ${youtubeVideoId}...`);
        
        // Try without credentials first to debug the issue
        const ytCookie = process.env.YT_COOKIE;
        
        // Clean the cookie - remove any whitespace and special characters
        const cleanCookie = ytCookie ? ytCookie.trim() : undefined;
        
        if (cleanCookie) {
            console.log(`[YouTube-Poller] Using YouTube cookie (length: ${cleanCookie.length})`);
        } else {
            console.warn(`[YouTube-Poller] WARNING: No YT_COOKIE configured - chat access may be limited!`);
        }
        
        // Use Masterchat.init() - try without credentials first to test basic functionality
        const mc = await Masterchat.init(youtubeVideoId, { 
            mode: "live"
        });
        activePollers.set(liveSessionId, mc);
        
        // Log metadata about the stream (cast to any to access available properties)
        const metadata = mc.metadata as any;
        if (metadata) {
            console.log(`[YouTube-Poller] Stream Title: ${metadata.title || 'N/A'}`);
            console.log(`[YouTube-Poller] Channel Name: ${metadata.channelName || 'N/A'}`);
            console.log(`[YouTube-Poller] Is Live: ${metadata.isLive || false}`);
            console.log(`[YouTube-Poller] Channel ID: ${metadata.channelId || 'N/A'}`);
        }

        mc.on("chat", async (chat: any) => {
            console.log(`[YouTube-Poller] Event: Chat received from ${chat.authorName}`);
            
            // Extract message text from various potential Masterchat formats
            let messageText = "";
            if (chat.message && Array.isArray(chat.message)) {
                messageText = chat.message.map((part: any) => part.text || "").join("");
            } else if (chat.displayText) {
                messageText = chat.displayText;
            } else if (chat.rawMessage) {
                messageText = chat.rawMessage.toString();
            }

            if (!messageText || messageText.trim() === "") {
                console.log("[YouTube-Poller] Skipping empty/unparseable message from", chat.authorName || "Unknown");
                return;
            }

            const authorName = chat.authorName || "Anonymous";
            
            // Filter out system/own messages
            if (chat.isModerator && authorName.toLowerCase().includes("bot")) {
                console.log("[YouTube-Poller] Filtering out bot message from", authorName);
                return;
            }

            console.log(`[YouTube-Poller] [CAPTURED] ${authorName}: ${messageText}`);


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
            console.log(`[YouTube-Poller] YouTube stream ended for session ${liveSessionId}.`);
            activePollers.delete(liveSessionId);
        });

        mc.on("error", (err) => {
            console.error(`[YouTube-Poller] Masterchat Error for ${youtubeVideoId}:`, err.message);
            console.error(`[YouTube-Poller] Error details:`, JSON.stringify(err, Object.getOwnPropertyNames(err)));
            
            const isChatDisabled = err.message.includes("Chat is disabled");
            const isInvalidArgument = err.message.includes("invalid argument");
            
            if (isChatDisabled) {
                console.warn(`[YouTube-Poller] ⚠️  CHAT IS DISABLED ON YOUTUBE STREAM`);
                console.warn(`[YouTube-Poller] 💡 Solution: Enable chat in YouTube Studio > Stream > Chat > Enable live chat`);
                console.warn(`[YouTube-Poller] Loop Strategy: Will keep retrying every 10 seconds...`);
            }

            const isRetryable = isInvalidArgument || isChatDisabled;

            if (isRetryable) {
                console.warn(`[YouTube-Poller] Loop Strategy: Retrying in 10 seconds... (Reason: ${err.message})`);
                setTimeout(() => startPoller(liveSessionId, youtubeVideoId), 10000);
            } else {
                console.error("[YouTube-Poller] Non-retryable error. Stopping poller.");
                activePollers.delete(liveSessionId);
            }
        });

        // Start listening
        mc.listen();
        console.log(`[YouTube-Poller] ✅ Polling established for YouTube ID: ${youtubeVideoId}`);

    } catch (e: any) {
        console.error(`[YouTube-Poller] FAILED to init Masterchat for ${youtubeVideoId}:`, e.message);
        
        // Even init failure can be temporary if the video was JUST created
        console.warn("[YouTube-Poller] Retrying init in 10 seconds...");
        setTimeout(() => startPoller(liveSessionId, youtubeVideoId), 10000);
    }
}




async function stopPoller(liveSessionId: string) {
    const mc = activePollers.get(liveSessionId);
    if (!mc) {
        console.log(`[YouTube-Poller] No active poller for session ${liveSessionId}.`);
        return;
    }
    mc.stop();
    activePollers.delete(liveSessionId);
    console.log(`[YouTube-Poller] ⏹️ Stopped poller for session ${liveSessionId}.`);
}

// Graceful shutdown
process.on("SIGINT", async () => {
    console.log("[YouTube-Poller] Shutting down...");
    for (const [id, mc] of activePollers.entries()) {
        mc.stop();
        console.log(`[YouTube-Poller] Stopped poller for ${id}`);
    }
    process.exit(0);
});
