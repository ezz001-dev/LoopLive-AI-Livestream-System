import { NextResponse } from "next/server";
import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import {
  assertR2Env,
  getR2SignedReadTtlSeconds,
  getStorageProvider,
  isSignedR2ReadEnabled,
} from "@/lib/storage-config";
import { getCurrentTenantId } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function createR2Client(tenantId: string) {
  const env = await assertR2Env(tenantId);

  return new S3Client({
    region: "auto",
    endpoint: env.endpoint,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });
}

export async function GET() {
  const tenantId = await getCurrentTenantId();
  const provider = await getStorageProvider(tenantId);

  if (provider !== "r2") {
    return NextResponse.json({
      ok: true,
      storageProvider: provider,
      message: "Local storage mode is active",
    });
  }

  try {
    const env = await assertR2Env(tenantId);
    const client = await createR2Client(tenantId);

    await client.send(new HeadBucketCommand({
      Bucket: env.bucketName,
    }));

    return NextResponse.json({
      ok: true,
      storageProvider: provider,
      bucket: env.bucketName,
      endpoint: env.endpoint,
      publicUrl: env.publicUrl,
      signedReads: await isSignedR2ReadEnabled(tenantId),
      signedReadTtlSeconds: await getR2SignedReadTtlSeconds(tenantId),
    });
  } catch (error: any) {
    console.error("[Storage Health] R2 health check failed:", error);
    return NextResponse.json({
      ok: false,
      storageProvider: provider,
      error: error.message || "R2 health check failed",
    }, { status: 500 });
  }
}
