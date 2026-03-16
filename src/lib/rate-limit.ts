import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new Redis(redisUrl);

type RateLimitOptions = {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix: string;
};

/**
 * Simple Rate Limiter using Redis INCR and EXPIRE.
 * Returns { success: boolean, limit: number, remaining: number, reset: number }
 */
export async function rateLimit(identifier: string, options: RateLimitOptions) {
  const key = `ratelimit:${options.keyPrefix}:${identifier}`;
  
  // Increment and get current value
  const current = await redis.incr(key);
  
  if (current === 1) {
    // First request in the window, set expiry
    await redis.expire(key, options.windowSeconds);
  }
  
  const remaining = Math.max(0, options.maxRequests - current);
  const ttl = await redis.ttl(key);
  
  return {
    success: current <= options.maxRequests,
    limit: options.maxRequests,
    remaining,
    reset: Math.max(0, ttl),
  };
}
