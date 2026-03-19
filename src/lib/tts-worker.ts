import Redis from "ioredis";
import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "./prisma";
import { enqueueAudioEvent } from "./audio-event-manager";
import { recordUsage } from "./usage";
import { decrypt } from "./crypto";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { EdgeTTS } from '@andresaya/edge-tts';

dotenv.config();

const AUDIO_DIR = path.join(process.cwd(), "public", "audio");
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

console.log(`[TTS-Worker] Starting TTS Worker with Tenant-Scoped Settings...`);

async function getTenantSettings(tenantId: string) {
    let settings = await (prisma as any).tenant_settings.findUnique({ where: { tenant_id: tenantId } });
    if (!settings) {
        settings = await (prisma as any).tenant_settings.create({
            data: {
                tenant_id: tenantId,
                tts_provider: process.env.TTS_PROVIDER || "openai",
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

// --- Provider Implementations ---

async function ttsWithOpenAI(text: string, filepath: string, apiKey: string) {
    const openai = new OpenAI({ apiKey });
    const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(filepath, buffer);
}

async function ttsWithGemini(text: string, filepath: string, apiKey: string) {
    const geminiAI = new GoogleGenerativeAI(apiKey);
    const model = geminiAI.getGenerativeModel({ model: "gemini-2.5-flash-tts" });
    
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: text }] }],
        generationConfig: {
            responseModalities: ["audio"],
            responseMimeType: "audio/mpeg",
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: "Kore"
                    }
                }
            }
        }
    } as any);

    const part = result.response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData?.data) {
        const audioData = Buffer.from(part.inlineData.data, "base64");
        await fs.promises.writeFile(filepath, audioData);
    } else {
        throw new Error("Gemini TTS returned no audio data.");
    }
}

async function ttsWithEdge(text: string, filepath: string) {
    const tts = new EdgeTTS();
    // Default to Indonesian voice since the app is targeted at ID users
    const voice = "id-ID-ArdiNeural"; 
    await tts.synthesize(text, voice);
    // Use full filepath directly
    await tts.toFile(filepath);
}

let redisPub: Redis;
let redisSub: Redis;

async function startWorker() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    
    redisPub = new Redis(redisUrl);
    redisSub = new Redis(redisUrl);

    console.log(`[TTS-Worker] Starting TTS Worker on Redis: ${redisUrl}`);

    redisSub.subscribe("ai_voice_play", (err, count) => {
        if (err) {
            console.error("[TTS-Worker] Redis subscription error:", err);
        } else {
            console.log(`[TTS-Worker] Subscribed to ${count} Redis channels.`);
        }
    });

    redisSub.on("message", async (channel, message) => {
        if (channel !== "ai_voice_play") return;

        try {
            const data = JSON.parse(message);
            const { liveId, tenantId, text, replyId } = data;

            if (!liveId || !text || !replyId) return;

            const filename = `${replyId}.mp3`;
            const filepath = path.join(AUDIO_DIR, filename);

            if (!tenantId) {
                console.warn(`[TTS-Worker] Event for session ${liveId} missing tenantId. Fallback to global env keys.`);
            }

            const settings = tenantId ? await getTenantSettings(tenantId) : null;
            if (settings?.use_client_side_ai) {
                console.log(`[TTS-Worker][Tenant:${tenantId}] Skipping: Client-side BYOK is active.`);
                return;
            }

            const secrets = tenantId ? await getTenantSecrets(tenantId) : {};
            
            const provider = settings?.tts_provider || process.env.TTS_PROVIDER || "openai";
            
            let success = false;

            if (provider === "gemini") {
                try {
                    const apiKey = secrets.gemini_api_key || process.env.GEMINI_API_KEY || "";
                    await ttsWithGemini(text, filepath, apiKey);
                    success = true;
                    console.log(`[TTS-Worker] ✅ Gemini TTS succeeded for tenant ${tenantId}`);
                } catch (error: any) {
                    console.error(`[TTS-Worker] ❌ Gemini TTS failed: ${error.message}`);
                }
            } else if (provider === "openai") {
                try {
                    const apiKey = secrets.openai_api_key || process.env.OPENAI_API_KEY || "";
                    await ttsWithOpenAI(text, filepath, apiKey);
                    success = true;
                    console.log(`[TTS-Worker] ✅ OpenAI TTS succeeded for tenant ${tenantId}`);
                } catch (error: any) {
                    console.error(`[TTS-Worker] ❌ OpenAI TTS failed: ${error.message}`);
                }
            } else if (provider === "edge") {
                try {
                    await ttsWithEdge(text, filepath);
                    success = true;
                    console.log(`[TTS-Worker] ✅ Edge TTS succeeded`);
                } catch (error: any) {
                    console.error(`[TTS-Worker] ❌ Edge TTS failed: ${error.message}`);
                }
            }

            // Fallback
            if (!success && provider !== "edge") {
                console.log(`[TTS-Worker] 🔄 Trying Edge TTS fallback...`);
                try {
                    await ttsWithEdge(text, filepath);
                    success = true;
                } catch (e: any) {
                    console.error(`[TTS-Worker] ❌ Edge TTS fallback failed: ${e.message}`);
                }
            }

            if (!success) return;

            // --- Record Usage ---
            if (tenantId) {
                const estimatedSeconds = Math.max(1, Math.ceil(text.length / 15));
                await recordUsage(tenantId, "tts_seconds", estimatedSeconds, {
                    replyId,
                    provider,
                    charCount: text.length
                });
            }

            const relativeAudioUrl = `/audio/${filename}`;
            await prisma.ai_reply_logs.update({
                where: { id: replyId },
                data: { audio_url: relativeAudioUrl }
            });

            await redisPub.publish("ai_audio_ready", JSON.stringify({
                liveId,
                replyId,
                audioUrl: relativeAudioUrl,
                text
            }));

            await enqueueAudioEvent({
                liveId,
                type: "tts",
                audioPath: relativeAudioUrl,
                metadata: { replyId },
            });

        } catch (error: any) {
            console.error("[TTS-Worker] Error processing TTS event:", error.message);
        }
    });
}

startWorker();
