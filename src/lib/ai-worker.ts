import Redis from "ioredis";
import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "./prisma";
import * as dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const redisPub = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const redisSub = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

console.log(`[AI-Worker] Starting AI Worker with Dynamic DB Settings...`);

// Simple Context Fetcher
async function getLiveSessionContext(liveId: string) {
    const session = await prisma.live_sessions.findUnique({
        where: { id: liveId },
        include: {
            chat_logs: {
                orderBy: { created_at: "desc" },
                take: 10
            }
        }
    });
    return session;
}

// --- Dynamic Provider Logic ---

async function getSystemSettings() {
    let settings = await prisma.system_settings.findUnique({ where: { id: "1" } });
    if (!settings) {
        // Fallback to defaults/env if not in DB yet
        settings = await prisma.system_settings.create({
            data: {
                id: "1",
                ai_provider: process.env.AI_PROVIDER || "openai",
                openai_api_key: process.env.OPENAI_API_KEY,
                gemini_api_key: process.env.GEMINI_API_KEY,
                ai_name: "Loop",
                ai_persona: "You are an AI Livestreamer named Loop. Respond to followers in a way that is engaging and keeps the conversation flowing.",
                max_response_length: 150
            }
        });
    }
    return settings;
}

async function generateReply(session: any, viewerMessage: string, viewerId: string) {
    const settings = await getSystemSettings();
    const provider = settings.ai_provider;
    
    const recentChats = session.chat_logs
        .reverse()
        .map((c: any) => `${c.viewer_id}: ${c.message}`)
        .join("\n");

    const systemPrompt = `
${settings.ai_persona || "You are an AI Livestreamer."}
Your tone for this session is: ${session.ai_tone}.
AI Name: ${settings.ai_name}.
Context for this stream: ${session.context_text || "General entertainment stream"}.

Guidelines:
- Keep responses concise and engaging for a live audience (max 2 sentences).
- Respond to the latest message while being aware of the last few chats.
- Never mention you are an AI unless asked directly.
- Use the AI name "${settings.ai_name}" if you need to refer to yourself.

Recent Chat History:
${recentChats}
    `.trim();

    const userInput = `${viewerId}: ${viewerMessage}`;
    const maxTokens = settings.max_response_length || 150;

    if (provider === "gemini") {
        console.log("[AI-Worker] Calling Google Gemini...");
        const apiKey = settings.gemini_api_key || process.env.GEMINI_API_KEY || "";
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: systemPrompt,
        });
        const result = await model.generateContent(userInput);
        return result.response.text();
    } else {
        console.log("[AI-Worker] Calling OpenAI...");
        const apiKey = settings.openai_api_key || process.env.OPENAI_API_KEY || "";
        const openai = new OpenAI({ apiKey });
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userInput }
            ],
            max_tokens: maxTokens,
        });
        return completion.choices[0]?.message?.content || "Thanks for stopping by!";
    }
}

// --- Main Message Handler ---

redisSub.subscribe("chat_event_queue", (err, count) => {
    if (err) {
        console.error("[AI-Worker] Redis subscription error:", err);
    } else {
        console.log(`[AI-Worker] Subscribed to ${count} Redis channels.`);
    }
});

redisSub.on("message", async (channel, message) => {
    if (channel !== "chat_event_queue") return;

    try {
        const event = JSON.parse(message);
        if (event.type !== "NEW_CHAT") return;

        const { liveId, chatId, message: viewerMessage, viewerId } = event;
        console.log(`[AI-Worker] Processing message from ${viewerId} in session ${liveId}`);

        // 1. Fetch Context
        const session = await getLiveSessionContext(liveId);
        if (!session) {
            console.error(`[AI-Worker] Session ${liveId} not found.`);
            return;
        }

        // 2. Generate Reply
        const replyText = await generateReply(session, viewerMessage, viewerId);
        console.log(`[AI-Worker] AI Reply: ${replyText}`);

        // 3. Save to Database
        const aiReply = await prisma.ai_reply_logs.create({
            data: {
                live_session_id: liveId,
                chat_id: chatId,
                prompt: viewerMessage,
                reply: replyText,
            }
        });

        // 4. Publish back to WebSocket Server
        await redisPub.publish("chat_broadcast", JSON.stringify({
            id: aiReply.id,
            liveId,
            viewerId: "AI_ASSISTANT",
            message: replyText,
            createdAt: aiReply.created_at
        }));

        // Trigger TTS
        await redisPub.publish("ai_voice_play", JSON.stringify({
            liveId,
            text: replyText,
            replyId: aiReply.id
        }));

    } catch (error: any) {
        console.error("[AI-Worker] Error processing chat event:", error.message);
    }
});
