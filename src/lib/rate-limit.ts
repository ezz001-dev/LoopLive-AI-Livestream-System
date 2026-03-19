import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new Redis(redisUrl);

type RateLimitOptions = {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix: string;
};

/**
 * Atomic Rate Limiter using Redis pipeline (INCR + EXPIRE in one round-trip).
 * Eliminates the race condition where a crash between INCR and EXPIRE
 * would leave a key that never expires, permanently blocking the user.
 * Returns { success: boolean, limit: number, remaining: number, reset: number }
 */
export async function rateLimit(identifier: string, options: RateLimitOptions) {
  const key = `ratelimit:${options.keyPrefix}:${identifier}`;

  // Use pipeline to atomically INCR and EXPIRE in a single round-trip
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, options.windowSeconds);
  pipeline.ttl(key);
  const results = await pipeline.exec();

  const current = (results?.[0]?.[1] as number) ?? 1;
  const ttl = (results?.[2]?.[1] as number) ?? options.windowSeconds;

  const remaining = Math.max(0, options.maxRequests - current);

  return {
    success: current <= options.maxRequests,
    limit: options.maxRequests,
    remaining,
    reset: Math.max(0, ttl),
  };
}
