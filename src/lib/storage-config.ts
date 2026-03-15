import { prisma } from "./prisma";
import { decrypt } from "./crypto";

export type StorageProvider = "local" | "r2";

async function getTenantSettings(tenantId: string) {
  return (prisma as any).tenant_settings.findUnique({ where: { tenant_id: tenantId } });
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

export async function getStorageProvider(tenantId?: string): Promise<StorageProvider> {
  if (tenantId) {
    const settings = await getTenantSettings(tenantId);
    if (settings?.storage_provider) {
      return (settings.storage_provider.toLowerCase() === "r2" ? "r2" : "local") as StorageProvider;
    }
  }
  const provider = (process.env.STORAGE_PROVIDER || "local").toLowerCase();
  return provider === "r2" ? "r2" : "local";
}

export async function isR2StorageEnabled(tenantId?: string) {
  return (await getStorageProvider(tenantId)) === "r2";
}

export async function getTenantR2Config(tenantId: string) {
  const settings = await getTenantSettings(tenantId);
  const secrets = await getTenantSecrets(tenantId);

  return {
    accessKeyId: secrets.r2_access_key_id || process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: secrets.r2_secret_access_key || process.env.R2_SECRET_ACCESS_KEY,
    endpoint: secrets.r2_endpoint || process.env.R2_ENDPOINT,
    bucketName: secrets.r2_bucket_name || process.env.R2_BUCKET_NAME,
    publicUrl: settings?.r2_public_url || process.env.R2_PUBLIC_URL,
  };
}

export async function assertR2Env(tenantId?: string) {
  let config;
  if (tenantId) {
    config = await getTenantR2Config(tenantId);
  } else {
    config = {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      endpoint: process.env.R2_ENDPOINT,
      bucketName: process.env.R2_BUCKET_NAME,
      publicUrl: process.env.R2_PUBLIC_URL,
    };
  }

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing R2 configuration for tenant ${tenantId || 'global'}: ${missing.join(", ")}`);
  }

  return config as {
    accessKeyId: string;
    secretAccessKey: string;
    endpoint: string;
    bucketName: string;
    publicUrl: string;
  };
}

export async function isSignedR2ReadEnabled(tenantId?: string) {
  if (tenantId) {
    const settings = await getTenantSettings(tenantId);
    if (settings) return settings.r2_signed_reads;
  }
  return process.env.R2_SIGNED_READS === "true";
}

export async function getR2SignedReadTtlSeconds(tenantId?: string) {
  let ttl = 43200;
  if (tenantId) {
    const settings = await getTenantSettings(tenantId);
    if (settings?.r2_signed_read_ttl_seconds) {
      ttl = settings.r2_signed_read_ttl_seconds;
    }
  } else {
    ttl = Number(process.env.R2_SIGNED_READ_TTL_SECONDS || "43200");
  }

  if (!Number.isFinite(ttl) || ttl <= 0) {
    return 43200;
  }
  return Math.floor(ttl);
}
