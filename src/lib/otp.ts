import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new Redis(redisUrl);

const OTP_EXPIRY_SECONDS = 300; // 5 minutes

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function storeOTP(email: string, otp: string) {
  const key = `otp:${email.toLowerCase()}`;
  await redis.set(key, otp, "EX", OTP_EXPIRY_SECONDS);
  console.log(`[OTP] Stored for ${email} (Expires in 5m)`);
}

export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  const key = `otp:${email.toLowerCase()}`;
  const storedOTP = await redis.get(key);
  
  if (storedOTP === otp) {
    await redis.del(key); // Use once and delete
    return true;
  }
  
  return false;
}
