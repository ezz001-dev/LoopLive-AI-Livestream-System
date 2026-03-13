import crypto from "crypto";
import fs from "fs";
import { mkdir } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { assertR2Env, getStorageProvider, type StorageProvider } from "@/lib/storage-config";

export type UploadedAsset = {
  originalFilename: string;
  fileType: string;
  fileSize: bigint;
  storageProvider: StorageProvider;
  storageKey: string | null;
  filePath: string;
  publicUrl: string | null;
};

function getSafeExtension(filename: string) {
  return path.extname(filename) || ".bin";
}

function buildObjectKey(prefix: string, id: string, filename: string) {
  return `${prefix}/${id}${getSafeExtension(filename)}`;
}

function normalizePublicUrl(baseUrl: string, key: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${key}`;
}

async function uploadToLocal(file: File, objectKey: string): Promise<UploadedAsset> {
  const uploadDir = path.join(process.cwd(), "public", "videos");
  const filename = path.basename(objectKey);
  const filepath = path.join(uploadDir, filename);

  await mkdir(uploadDir, { recursive: true });

  const writeStream = fs.createWriteStream(filepath);
  const nodeStream = Readable.fromWeb(file.stream() as any);

  await new Promise<void>((resolve, reject) => {
    nodeStream.pipe(writeStream);
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
    nodeStream.on("error", reject);
  });

  return {
    originalFilename: file.name,
    fileType: file.type,
    fileSize: BigInt(file.size),
    storageProvider: "local",
    storageKey: objectKey,
    filePath: `/videos/${filename}`,
    publicUrl: null,
  };
}

async function uploadToR2(file: File, objectKey: string): Promise<UploadedAsset> {
  const env = assertR2Env();
  const { PutObjectCommand, S3Client } = await import("@aws-sdk/client-s3");

  const client = new S3Client({
    region: "auto",
    endpoint: env.endpoint,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });

  await client.send(new PutObjectCommand({
    Bucket: env.bucketName,
    Key: objectKey,
    Body: Readable.fromWeb(file.stream() as any),
    ContentType: file.type || "application/octet-stream",
    ContentLength: file.size,
  }));

  const publicUrl = normalizePublicUrl(env.publicUrl, objectKey);

  return {
    originalFilename: file.name,
    fileType: file.type,
    fileSize: BigInt(file.size),
    storageProvider: "r2",
    storageKey: objectKey,
    filePath: publicUrl,
    publicUrl,
  };
}

export async function uploadVideoAsset(file: File) {
  const assetId = crypto.randomUUID();
  const objectKey = buildObjectKey("videos", assetId, file.name);
  const provider = getStorageProvider();

  const uploaded =
    provider === "r2"
      ? await uploadToR2(file, objectKey)
      : await uploadToLocal(file, objectKey);

  return {
    id: assetId,
    ...uploaded,
  };
}

export function resolveVideoInputSource(video: {
  file_path: string;
  storage_provider?: string | null;
  public_url?: string | null;
}) {
  if (video.storage_provider === "r2") {
    return video.public_url || video.file_path;
  }

  if (video.file_path.startsWith("/videos/")) {
    return path.join(process.cwd(), "public", video.file_path.replace(/^\/+/, ""));
  }

  return video.file_path;
}
