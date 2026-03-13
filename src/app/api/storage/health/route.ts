import { NextResponse } from "next/server";
import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import {
  assertR2Env,
  getR2SignedReadTtlSeconds,
  getStorageProvider,
  isSignedR2ReadEnabled,
} from "@/lib/storage-config";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function createR2Client() {
  const env = assertR2Env();

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
  const provider = getStorageProvider();

  if (provider !== "r2") {
    return NextResponse.json({
      ok: true,
      storageProvider: provider,
      message: "Local storage mode is active",
    });
  }

  try {
    const env = assertR2Env();
    const client = createR2Client();

    await client.send(new HeadBucketCommand({
      Bucket: env.bucketName,
    }));

    return NextResponse.json({
      ok: true,
      storageProvider: provider,
      bucket: env.bucketName,
      endpoint: env.endpoint,
      publicUrl: env.publicUrl,
      signedReads: isSignedR2ReadEnabled(),
      signedReadTtlSeconds: getR2SignedReadTtlSeconds(),
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
