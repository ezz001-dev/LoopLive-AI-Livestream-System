import Redis from "ioredis";
import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "./prisma";
import * as dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const redisPub = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const redisSub = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Provider Configuration
const AI_PROVIDER = process.env.AI_PROVIDER || "gemini"; // openai, gemini, sumopod
const AI_MODEL = process.env.AI_MODEL || "gemini-2.5-flash";
const SUMOPOD_API_URL = process.env.SUMOPOD_API_URL || "https://ai.sumopod.com";
const SUMOPOD_API_KEY = process.env.SUMOPOD_API_KEY || "";

// Initialize clients
const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY || "sk-dummy-key",
    baseURL: process.env.OPENAI_BASE_URL // For custom endpoints
});

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "gemini-dummy-key");

console.log(`[AI-Worker] Starting AI Worker...`);
console.log(`[AI-Worker] Provider: ${AI_PROVIDER}, Model: ${AI_MODEL}`);

// Simple RAG & Context Fetcher
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

// --- Provider Implementations ---

async function generateWithOpenAI(systemPrompt: string, userMessage: string): Promise<string> {
    const completion = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
        ],
        max_tokens: 150,
    });
    return completion.choices[0]?.message?.content || "Thanks for stopping by!";
}

async function generateWithGemini(systemPrompt: string, userMessage: string): Promise<string> {
    const model = gemini.getGenerativeModel({ 
        model: AI_MODEL,
        systemInstruction: systemPrompt,
    });
    const result = await model.generateContent(userMessage);
    return result.response.text() || "Thanks for stopping by!";
}

async function generateWithSumoPod(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await axios.post(`${SUMOPOD_API_URL}/v1/chat/completions`, {
        model: AI_MODEL,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
        ],
        max_tokens: 150,
        temperature: 0.7
    }, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUMOPOD_API_KEY}`
        }
    });
    return response.data.choices[0]?.message?.content || "Thanks for stopping by!";
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

        const recentChats = session.chat_logs
            .reverse()
            .map(c => `${c.viewer_id}: ${c.message}`)
            .join("\n");

        const systemPrompt = `
You are an AI Livestreamer Assistant. 
Your tone is: ${session.ai_tone}.
Context for this stream: ${session.context_text || "General entertainment stream"}.

Guidelines:
- Keep responses concise and engaging for a live audience (max 2 sentences).
- Respond to the latest message while being aware of the last few chats.
- Never mention you are an AI unless asked directly.
- Be friendly and interact with the viewer.

Recent Chat History:
${recentChats}
        `.trim();

        const userInput = `${viewerId}: ${viewerMessage}`;

        // 2. Generate Reply using selected provider
        let replyText: string;
        if (AI_PROVIDER === "gemini") {
            console.log("[AI-Worker] Calling Google Gemini...");
            replyText = await generateWithGemini(systemPrompt, userInput);
        } else if (AI_PROVIDER === "sumopod") {
            console.log("[AI-Worker] Calling SumoPod...");
            replyText = await generateWithSumoPod(systemPrompt, userInput);
        } else {
            console.log("[AI-Worker] Calling OpenAI...");
            replyText = await generateWithOpenAI(systemPrompt, userInput);
        }
        
        console.log(`[AI-Worker] AI Reply (${AI_PROVIDER}): ${replyText}`);

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

        // Channel: ai_voice_play -> TTS Worker
        await redisPub.publish("ai_voice_play", JSON.stringify({
            liveId,
            text: replyText,
            replyId: aiReply.id
        }));

    } catch (error: any) {
        console.error("[AI-Worker] Error processing chat event:", error.message);
    }
});
