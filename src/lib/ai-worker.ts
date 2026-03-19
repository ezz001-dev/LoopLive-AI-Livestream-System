import Redis from "ioredis";
import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "./prisma";
import { getLiveSessionTenantId } from "./tenant-context";
import { decrypt } from "./crypto";
import { recordUsage } from "./usage";
import { checkPlanLimit } from "./limits";
import { searchKnowledgeBase } from "./vector-store";
import * as dotenv from "dotenv";
import axios from "axios";

dotenv.config();

async function getTenantSettings(tenantId: string) {
    let settings = await (prisma as any).tenant_settings.findUnique({ where: { tenant_id: tenantId } });
    if (!settings) {
        // Fallback to defaults if tenant settings not initialized
        settings = await (prisma as any).tenant_settings.create({
            data: {
                tenant_id: tenantId,
                ai_provider: process.env.AI_PROVIDER || "openai",
                ai_name: "Loop",
                ai_persona: "You are an AI Livestreamer named Loop. Respond to followers in a way that is engaging and keeps the conversation flowing.",
                max_response_length: 150,
            }
        });
    }
    return settings;
}

async function getTenantSecrets(tenantId: string) {
    const secrets = await (prisma as any).tenant_secrets.findMany({
        where: { tenant_id: tenantId }
    });
    return secrets.reduce((acc: any, s: any) => {
        acc[s.key] = decrypt(s.encrypted_value);
        return acc;
    }, {});
}

// Simple Context Fetcher
async function getLiveSessionContext(liveId: string) {
    const session = await (prisma.live_sessions as any).findUnique({
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

async function shouldSkipTtsForMessage(liveId: string, viewerMessage: string) {
    const normalizedMessage = viewerMessage.trim().toLowerCase();
    if (!normalizedMessage) return false;

    const tenantId = await getLiveSessionTenantId(liveId);
    if (!tenantId) return false;

    const soundEvents = await (prisma.sound_events as any).findMany({
        where: {
            tenant_id: tenantId,
            event_type: "keyword",
            active: true,
        },
        select: {
            id: true,
            keyword: true,
            audio_url: true,
        }
    });

    const matchedEvent = soundEvents.find((event: any) =>
        event.keyword && normalizedMessage.includes(event.keyword.toLowerCase())
    );

    if (matchedEvent) {
        console.log(
            `[AI-Worker][TTS-SKIP] Matched keyword sound "${matchedEvent.keyword}" -> skip TTS for message: "${viewerMessage}"`
        );
        return true;
    }

    return false;
}

async function generateReply(session: any, viewerMessage: string, viewerId: string) {
    const tenantId = session.tenant_id;
    const settings = await getTenantSettings(tenantId);
    const secrets = await getTenantSecrets(tenantId);
    
    const provider = settings.ai_provider;

    const recentChats = session.chat_logs
        .reverse()
        .map((c: any) => `${c.viewer_id}: ${c.message}`)
        .join("\n");


    // BUG-10 FIX: Search Knowledge Base for relevant context (RAG)
    let knowledgeBaseContext = "";
    try {
        const kbResults = await searchKnowledgeBase(viewerMessage, tenantId, 3);
        if (kbResults.length > 0) {
            knowledgeBaseContext = kbResults
                .map((res: any) => `Relevant Info from "${res.documentTitle}": ${res.content}`)
                .join("\n\n");
        }
    } catch (err: any) {
        console.error(`[AI-Worker] KB Search Error:`, err.message);
    }

    const systemPrompt = `
${settings.ai_persona || "You are an AI Livestreamer."}
Your tone for this session is: ${session.ai_tone}.
AI Name: ${settings.ai_name}.
Context for this stream: ${session.context_text || "General entertainment stream"}.

${knowledgeBaseContext ? `--- KNOWLEDGE BASE CONTEXT ---\n${knowledgeBaseContext}\n------------------------------` : ""}

Guidelines:
- Keep responses concise and engaging for a live audience (max 2 sentences).
- Respond to the latest message while being aware of the last few chats.
- Never mention you are an AI unless asked directly.
- Use the AI name "${settings.ai_name}" if you need to refer to yourself.
${knowledgeBaseContext ? "- Use the KNOWLEDGE BASE CONTEXT provided above to answer specific questions accurately." : ""}

Recent Chat History:
${recentChats}
    `.trim();

    const userInput = `${viewerId}: ${viewerMessage}`;
    const maxTokens = settings.max_response_length || 150;

    if (provider === "gemini") {
        console.log(`[AI-Worker][Tenant:${tenantId}] Calling Google Gemini...`);
        const apiKey = secrets.gemini_api_key || process.env.GEMINI_API_KEY || "";
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt,
        });
        const result = await model.generateContent(userInput);
        return result.response.text();
    } else {
        console.log(`[AI-Worker][Tenant:${tenantId}] Calling OpenAI...`);
        const apiKey = secrets.openai_api_key || process.env.OPENAI_API_KEY || "";
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

let redisPub: Redis;
let redisSub: Redis;

async function startWorker() {
    // Redis URL remains global/infra-level
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    redisPub = new Redis(redisUrl);
    redisSub = new Redis(redisUrl);

    console.log(`[AI-Worker] Starting AI Worker on Redis: ${redisUrl}`);

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

            // 2. Limit Check
            const tenantId = session.tenant_id;
            const settings = await getTenantSettings(tenantId);

            if (settings.use_client_side_ai) {
                console.log(`[AI-Worker][Tenant:${tenantId}] Skipping: Client-side BYOK is active.`);
                return;
            }

            const limitCheck = await checkPlanLimit(tenantId, "maxAiResponsesPerDay");
            if (!limitCheck.allowed) {
                console.warn(`[AI-Worker][Tenant:${tenantId}] Limit reached: ${limitCheck.message}`);
                return;
            }

            // 3. Generate Reply
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

            // --- Record Usage ---
            if (tenantId) {
                await recordUsage(tenantId, "ai_responses", 1, {
                    replyId: aiReply.id,
                    provider: settings.ai_provider, 
                    liveId: liveId
                });
            }

            // 4. Publish back to WebSocket Server
            await redisPub.publish("chat_broadcast", JSON.stringify({
                id: aiReply.id,
                liveId,
                viewerId: "AI_ASSISTANT",
                message: replyText,
                createdAt: aiReply.created_at
            }));

            const skipTts = await shouldSkipTtsForMessage(liveId, viewerMessage);

            if (skipTts) {
                console.log(`[AI-Worker][TTS-SKIP] TTS suppressed for reply ${aiReply.id} in session ${liveId}`);
            } else {
                // Trigger TTS only when no keyword sound effect handled the interaction.
                await redisPub.publish("ai_voice_play", JSON.stringify({
                    liveId,
                    tenantId,
                    text: replyText,
                    replyId: aiReply.id
                }));
            }

        } catch (error: any) {
            console.error("[AI-Worker] Error processing chat event:", error.message);
        }
    });
}

startWorker();
