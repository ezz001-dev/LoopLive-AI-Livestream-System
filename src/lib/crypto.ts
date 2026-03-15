import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * MASTER_ENCRYPTION_KEY must be a 32-byte string (256 bits).
 * In production, this should be provided via environment variables.
 */
const MASTER_KEY = process.env.MASTER_ENCRYPTION_KEY || "default-32-character-encryption-key-!!";

if (process.env.NODE_ENV === "production" && (!process.env.MASTER_ENCRYPTION_KEY || process.env.MASTER_ENCRYPTION_KEY.length < 32)) {
  console.error("FATAL: MASTER_ENCRYPTION_KEY is missing or too short in production!");
}

/**
 * Encrypts cleartext using AES-256-GCM.
 * Returns a colon-separated string: iv:authTag:ciphertext
 */
export function encrypt(text: string): string {
  if (!text) return "";
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(MASTER_KEY.substring(0, 32)), iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a colon-separated string: iv:authTag:ciphertext
 * Returns cleartext or throws error if integrity fails.
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return "";
  
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    // Fallback: If not in encrypted format, return as is (useful for migration phase)
    return encryptedData;
  }
  
  const [ivHex, authTagHex, encryptedHex] = parts;
  
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(MASTER_KEY.substring(0, 32)), iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}
