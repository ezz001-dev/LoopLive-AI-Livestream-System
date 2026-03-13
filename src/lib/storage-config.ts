const storageProvider = (process.env.STORAGE_PROVIDER || "local").toLowerCase();

export type StorageProvider = "local" | "r2";

export function getStorageProvider(): StorageProvider {
  return storageProvider === "r2" ? "r2" : "local";
}

export function isR2StorageEnabled() {
  return getStorageProvider() === "r2";
}

export function getRequiredR2Env() {
  return {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    endpoint: process.env.R2_ENDPOINT,
    bucketName: process.env.R2_BUCKET_NAME,
    publicUrl: process.env.R2_PUBLIC_URL,
  };
}

export function assertR2Env() {
  const env = getRequiredR2Env();
  const missing = Object.entries(env)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing R2 environment variables: ${missing.join(", ")}`);
  }

  return env as {
    accessKeyId: string;
    secretAccessKey: string;
    endpoint: string;
    bucketName: string;
    publicUrl: string;
  };
}
