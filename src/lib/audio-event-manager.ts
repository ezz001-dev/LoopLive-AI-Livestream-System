import crypto from "crypto";
import Redis from "ioredis";
import { prisma } from "@/lib/prisma";

export type AudioEvent = {
  id: string;
  liveId: string;
  type: "sound" | "tts";
  audioPath: string;
  createdAt: number;
  metadata?: Record<string, string>;
};

let redisClientPromise: Promise<Redis> | null = null;

function getAudioQueuePrefix() {
  return process.env.AUDIO_EVENT_QUEUE_PREFIX || "audio_event_queue";
}

function getAudioQueueKey(liveId: string) {
  return `${getAudioQueuePrefix()}:${liveId}`;
}

async function getRedisUrl() {
  const settings = await prisma.system_settings.findUnique({ where: { id: "1" } });
  return settings?.redis_url || process.env.REDIS_URL || "redis://localhost:6379";
}

async function getRedisClient() {
  if (!redisClientPromise) {
    redisClientPromise = (async () => {
      const redisUrl = await getRedisUrl();
      const client = new Redis(redisUrl);
      console.log(`[AudioEventManager] Connected to Redis: ${redisUrl}`);
      return client;
    })();
  }

  return redisClientPromise;
}

export async function enqueueAudioEvent(input: Omit<AudioEvent, "id" | "createdAt">) {
  const client = await getRedisClient();
  const event: AudioEvent = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    ...input,
  };

  const key = getAudioQueueKey(event.liveId);
  await client.rpush(key, JSON.stringify(event));
  const queueLength = await client.llen(key);

  console.log(
    `[AudioEventManager] Enqueued ${event.type} event for ${event.liveId}: ${event.audioPath} (queue=${queueLength})`
  );

  return { event, queueLength };
}

export async function peekAudioEvent(liveId: string) {
  const client = await getRedisClient();
  const key = getAudioQueueKey(liveId);
  const item = await client.lindex(key, 0);
  return item ? (JSON.parse(item) as AudioEvent) : null;
}

export async function shiftAudioEvent(liveId: string) {
  const client = await getRedisClient();
  const key = getAudioQueueKey(liveId);
  const item = await client.lpop(key);
  return item ? (JSON.parse(item) as AudioEvent) : null;
}

export async function clearAudioQueue(liveId: string) {
  const client = await getRedisClient();
  const key = getAudioQueueKey(liveId);
  await client.del(key);
  console.log(`[AudioEventManager] Cleared audio queue for ${liveId}`);
}

export async function hasPendingAudioEvent(liveId: string) {
  const client = await getRedisClient();
  const key = getAudioQueueKey(liveId);
  return (await client.llen(key)) > 0;
}

export async function getAudioQueueLength(liveId: string) {
  const client = await getRedisClient();
  return client.llen(getAudioQueueKey(liveId));
}
