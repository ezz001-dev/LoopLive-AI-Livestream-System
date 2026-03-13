import { Server } from "socket.io";
import { createServer } from "http";
import Redis from "ioredis";
import { prisma } from "./prisma";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"]
  }
});

const redisPub = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const redisSub = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

const PORT = process.env.SOCKET_PORT || 3001;

console.log("[SocketServer] Initializing...");

// Sound Trigger Helper
async function checkAndTriggerSound(liveId: string, type: "keyword" | "join", text?: string) {
  try {
    const soundEvents = await prisma.sound_events.findMany({
      where: { event_type: type, active: true }
    });

    for (const event of soundEvents) {
      if (type === "join") {
        // Play automatically on join
        io.to(liveId).emit("play_sound", { audioUrl: event.audio_url });
      } else if (type === "keyword" && event.keyword && text?.toLowerCase().includes(event.keyword.toLowerCase())) {
        // Play if keyword matches
        console.log(`[SocketServer] Keyword match: "${event.keyword}" -> Playing ${event.audio_url}`);
        io.to(liveId).emit("play_sound", { audioUrl: event.audio_url });
        break; // Only play one sound per message to avoid spam
      }
    }
  } catch (err) {
    console.error("[SocketServer] Error triggering sound:", err);
  }
}

io.on("connection", (socket) => {
  console.log(`[SocketServer] User connected: ${socket.id}`);

  // Join Room based on Live Session ID
  socket.on("join_room", async (liveId: string) => {
    socket.join(liveId);
    console.log(`[SocketServer] Socket ${socket.id} joined room: ${liveId}`);
    
    // Trigger "join" sound
    await checkAndTriggerSound(liveId, "join");
  });

  // Handle Chat Message from Viewer
  socket.on("chat_message", async (data: { liveId: string; viewerId: string; message: string }) => {
    const { liveId, viewerId, message } = data;
    console.log(`[SocketServer] Message in ${liveId} from ${viewerId}: ${message}`);

    try {
      // 1. Save to Database
      const chatLog = await prisma.chat_logs.create({
        data: {
          live_session_id: liveId,
          viewer_id: viewerId,
          message: message,
        }
      });

      // 2. Broadcast to other viewers in the same room (Immediate UI update)
      io.to(liveId).emit("chat_broadcast", {
        id: chatLog.id,
        viewerId,
        message,
        createdAt: chatLog.created_at
      });

      // 3. Trigger Sound Keyword check
      await checkAndTriggerSound(liveId, "keyword", message);

      // 4. Publish to Redis for AI Worker
      await redisPub.publish("chat_event_queue", JSON.stringify({
        type: "NEW_CHAT",
        liveId,
        chatId: chatLog.id,
        message,
        viewerId
      }));

    } catch (error) {
      console.error("[SocketServer] Error handling chat_message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`[SocketServer] User disconnected: ${socket.id}`);
  });
});

// Redis Subscription for AI Responses & TTS
redisSub.subscribe("chat_broadcast", "ai_audio_ready", (err, count) => {
  if (err) {
    console.error("[SocketServer] Redis subscription error:", err);
  } else {
    console.log(`[SocketServer] Subscribed to ${count} Redis channels.`);
  }
});

redisSub.on("message", (channel, message) => {
  try {
    const data = JSON.parse(message);
    const { liveId } = data;

    if (!liveId) {
       console.warn(`[SocketServer] Received message on ${channel} without liveId:`, message);
       return;
    }

    if (channel === "chat_broadcast") {
      // Broadcast AI Text Reply
      console.log(`[SocketServer] 💬 Broadcasting chat to room ${liveId}`);
      io.to(liveId).emit("chat_broadcast", data);
    } else if (channel === "ai_audio_ready") {
      // Trigger AI Voice Playback on Frontend with Audio URL
      console.log(`[SocketServer] 🔉 Broadcasting voice play event to room ${liveId}: ${data.audioUrl}`);
      io.to(liveId).emit("ai_voice_play", data);
    }
  } catch (error) {
    console.error("[SocketServer] Error processing Redis message:", error);
  }
});

httpServer.listen(PORT, () => {
  console.log(`[SocketServer] Running on port ${PORT}`);
});
