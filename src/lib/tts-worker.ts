import Redis from "ioredis";
import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "./prisma";
import { enqueueAudioEvent } from "./audio-event-manager";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { EdgeTTS } from '@andresaya/edge-tts';

dotenv.config();

const AUDIO_DIR = path.join(process.cwd(), "public", "audio");
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

console.log(`[TTS-Worker] Starting TTS Worker with Dynamic DB Settings...`);

async function getSystemSettings() {
    let settings = await prisma.system_settings.findUnique({ where: { id: "1" } });
    if (!settings) {
        settings = await prisma.system_settings.create({
            data: {
                id: "1",
                tts_provider: process.env.TTS_PROVIDER || "openai",
                openai_api_key: process.env.OPENAI_API_KEY,
                gemini_api_key: process.env.GEMINI_API_KEY,
                redis_url: process.env.REDIS_URL || "redis://localhost:6379"
            }
        });
    }
    return settings;
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
    const model = geminiAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // or whichever model supports TTS
    
    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: text }] }],
        generationConfig: {
            responseModalities: ["audio"],
            responseMimeType: "audio/mpeg",
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: "aoede"
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
    const voice = "en-US-AriaNeural"; 
    await tts.synthesize(text, voice);
    const baseFilepath = filepath.replace(/\.mp3$/, '');
    await tts.toFile(baseFilepath);
}

let redisPub: Redis;
let redisSub: Redis;

async function startWorker() {
    const settings = await getSystemSettings();
    const redisUrl = settings.redis_url || process.env.REDIS_URL || "redis://localhost:6379";
    
    redisPub = new Redis(redisUrl);
    redisSub = new Redis(redisUrl);

    console.log(`[TTS-Worker] Starting TTS Worker on Redis: ${redisUrl}`);

    // --- Main Message Handler ---

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
            const { liveId, text, replyId } = data;

            if (!liveId || !text || !replyId) return;

            const filename = `${replyId}.mp3`;
            const filepath = path.join(AUDIO_DIR, filename);

            const latestSettings = await getSystemSettings();
            const provider = latestSettings.tts_provider;
            
            let success = false;

            // Try selected provider
            if (provider === "gemini") {
                try {
                    const apiKey = latestSettings.gemini_api_key || process.env.GEMINI_API_KEY || "";
                    await ttsWithGemini(text, filepath, apiKey);
                    success = true;
                    console.log(`[TTS-Worker] ✅ Gemini TTS succeeded`);
                } catch (error: any) {
                    console.error(`[TTS-Worker] ❌ Gemini TTS failed: ${error.message}`);
                }
            } else if (provider === "openai") {
                try {
                    const apiKey = latestSettings.openai_api_key || process.env.OPENAI_API_KEY || "";
                    await ttsWithOpenAI(text, filepath, apiKey);
                    success = true;
                    console.log(`[TTS-Worker] ✅ OpenAI TTS succeeded`);
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

            // Fallback to Edge if others failed
            if (!success && provider !== "edge") {
                console.log(`[TTS-Worker] 🔄 Trying Edge TTS fallback...`);
                try {
                    await ttsWithEdge(text, filepath);
                    success = true;
                    console.log(`[TTS-Worker] ✅ Edge TTS fallback succeeded`);
                } catch (e: any) {
                    console.error(`[TTS-Worker] ❌ Edge TTS fallback failed: ${e.message}`);
                }
            }

            if (!success) {
                console.error(`[TTS-Worker] All TTS providers failed for reply ${replyId}`);
                return;
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

            const { queueLength } = await enqueueAudioEvent({
                liveId,
                type: "tts",
                audioPath: relativeAudioUrl,
                metadata: {
                    replyId,
                },
            });
            console.log(`[TTS-Worker] Queued TTS audio for ${liveId} (queue=${queueLength})`);

        } catch (error: any) {
            console.error("[TTS-Worker] Error processing TTS event:", error.message);
        }
    });
}

startWorker();
