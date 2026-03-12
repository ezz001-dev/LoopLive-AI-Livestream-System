import Redis from "ioredis";
import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "./prisma";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { EdgeTTS } from '@andresaya/edge-tts';

dotenv.config();

const redisPub = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const redisSub = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Provider Setup
const TTS_PROVIDER = process.env.TTS_PROVIDER || "gemini";
const TTS_MODEL = process.env.TTS_MODEL || "gemini-2.5-flash-preview-tts"; // TTS enabled model
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-dummy-key" });
const geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "gemini-dummy-key");

const AUDIO_DIR = path.join(process.cwd(), "public", "audio");
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

console.log(`[TTS-Worker] Starting TTS Worker... Provider: ${TTS_PROVIDER}, Model: ${TTS_MODEL}`);

// --- Provider Implementations ---

async function ttsWithOpenAI(text: string, filepath: string) {
    const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(filepath, buffer);
}

async function ttsWithGemini(text: string, filepath: string) {
    const modelName = TTS_MODEL || "gemini-2.5-flash-preview-tts";
    const model = geminiAI.getGenerativeModel({ model: modelName });
    
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
        console.log(`[TTS-Worker] Gemini TTS audio saved to ${filepath}`);
    } else {
        throw new Error("Gemini TTS returned no audio data. Model might not support TTS.");
    }
}

async function ttsWithEdge(text: string, filepath: string) {
    // Edge TTS - free, no API key needed
    const tts = new EdgeTTS();
    const voice = "en-US-AriaNeural"; // Good English voice
    
    // The library automatically handles extension if not provided, 
    // but the worker expects a specific filepath.
    // toFile returns the full path with extension if needed.
    await tts.synthesize(text, voice);
    
    // Remove extension from filepath if it has one because toFile adds it
    const baseFilepath = filepath.replace(/\.mp3$/, '');
    await tts.toFile(baseFilepath);
    
    console.log(`[TTS-Worker] Edge TTS audio saved to ${filepath}`);
}

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

        if (!liveId || !text || !replyId) {
            console.error("[TTS-Worker] Invalid payload received on ai_voice_play", data);
            return;
        }

        const filename = `${replyId}.mp3`;
        const filepath = path.join(AUDIO_DIR, filename);

        // Try providers with fallback
        let success = false;
        let lastError = null;

        // Primary provider based on config
        if (TTS_PROVIDER === "gemini") {
            console.log(`[TTS-Worker] Trying Gemini TTS for reply ${replyId}...`);
            try {
                await ttsWithGemini(text, filepath);
                success = true;
                console.log(`[TTS-Worker] ✅ Gemini TTS succeeded`);
            } catch (error: any) {
                console.error(`[TTS-Worker] ❌ Gemini TTS failed: ${error.message}`);
                lastError = error;
            }
        } else if (TTS_PROVIDER === "openai") {
            console.log(`[TTS-Worker] Trying OpenAI TTS for reply ${replyId}...`);
            try {
                await ttsWithOpenAI(text, filepath);
                success = true;
                console.log(`[TTS-Worker] ✅ OpenAI TTS succeeded`);
            } catch (error: any) {
                console.error(`[TTS-Worker] ❌ OpenAI TTS failed: ${error.message}`);
                lastError = error;
            }
        }

        // Fallback chain: try Edge TTS, then OpenAI
        if (!success) {
            console.log(`[TTS-Worker] 🔄 Trying Edge TTS fallback for reply ${replyId}...`);
            try {
                await ttsWithEdge(text, filepath);
                success = true;
                console.log(`[TTS-Worker] ✅ Edge TTS fallback succeeded`);
            } catch (edgeError: any) {
                console.error(`[TTS-Worker] ❌ Edge TTS failed: ${edgeError.message}`);
                
                // Try OpenAI as second fallback
                console.log(`[TTS-Worker] 🔄 Trying OpenAI TTS fallback...`);
                try {
                    await ttsWithOpenAI(text, filepath);
                    success = true;
                    console.log(`[TTS-Worker] ✅ OpenAI TTS fallback succeeded`);
                } catch (openaiError: any) {
                    console.error(`[TTS-Worker] ❌ OpenAI TTS also failed: ${openaiError.message}`);
                    lastError = openaiError;
                }
            }
        }

        if (!success) {
            console.error(`[TTS-Worker] All TTS providers failed for reply ${replyId}`);
            return;
        }

        console.log(`[TTS-Worker] Audio saved to ${filepath}`);
        const relativeAudioUrl = `/audio/${filename}`;

        // Update DB
        await prisma.ai_reply_logs.update({
            where: { id: replyId },
            data: { audio_url: relativeAudioUrl }
        });

        // Publish to WebSocket via Redis
        await redisPub.publish("ai_audio_ready", JSON.stringify({
            liveId,
            replyId,
            audioUrl: relativeAudioUrl,
            text
        }));

    } catch (error: any) {
        console.error("[TTS-Worker] Error processing TTS event:", error.message);
    }
});
