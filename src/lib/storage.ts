import crypto from "crypto";
import fs from "fs";
import { mkdir } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { assertR2Env, getStorageProvider, type StorageProvider } from "@/lib/storage-config";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type UploadedAsset = {
  id?: string;
  originalFilename: string;
  fileType: string;
  fileSize: bigint;
  storageProvider: StorageProvider;
  storageKey: string | null;
  filePath: string;
  publicUrl: string | null;
};

export type VideoUploadDraft = {
  id: string;
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
  const client = createR2Client();

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
  const draft = createVideoUploadDraft({
    filename: file.name,
    fileType: file.type,
    fileSize: file.size,
  });

  const uploaded =
    draft.storageProvider === "r2"
      ? await uploadToR2(file, draft.storageKey!)
      : await uploadToLocal(file, draft.storageKey!);

  return {
    id: draft.id,
    ...uploaded,
  };
}

export function createVideoUploadDraft(input: {
  filename: string;
  fileType: string;
  fileSize: number | bigint;
}) {
  const assetId = crypto.randomUUID();
  const provider = getStorageProvider();
  const objectKey = buildObjectKey("videos", assetId, input.filename);
  const normalizedSize =
    typeof input.fileSize === "bigint" ? input.fileSize : BigInt(input.fileSize);

  if (provider === "r2") {
    const env = assertR2Env();
    const publicUrl = normalizePublicUrl(env.publicUrl, objectKey);

    return {
      id: assetId,
      originalFilename: input.filename,
      fileType: input.fileType,
      fileSize: normalizedSize,
      storageProvider: provider,
      storageKey: objectKey,
      filePath: publicUrl,
      publicUrl,
    } satisfies VideoUploadDraft;
  }

  return {
    id: assetId,
    originalFilename: input.filename,
    fileType: input.fileType,
    fileSize: normalizedSize,
    storageProvider: provider,
    storageKey: objectKey,
    filePath: `/videos/${path.basename(objectKey)}`,
    publicUrl: null,
  } satisfies VideoUploadDraft;
}

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

export async function createPresignedVideoUploadUrl(draft: VideoUploadDraft) {
  if (draft.storageProvider !== "r2" || !draft.storageKey) {
    throw new Error("Presigned upload is only available for R2 storage");
  }

  const env = assertR2Env();
  const client = createR2Client();

  const command = new PutObjectCommand({
    Bucket: env.bucketName,
    Key: draft.storageKey,
    ContentType: draft.fileType || "application/octet-stream",
    ContentLength: Number(draft.fileSize),
  });

  return getSignedUrl(client, command, { expiresIn: 900 });
}

export async function verifyUploadedVideoObject(draft: VideoUploadDraft) {
  if (draft.storageProvider !== "r2" || !draft.storageKey) {
    return;
  }

  const env = assertR2Env();
  const client = createR2Client();
  const object = await client.send(new HeadObjectCommand({
    Bucket: env.bucketName,
    Key: draft.storageKey,
  }));

  const expectedSize = Number(draft.fileSize);
  if (typeof object.ContentLength === "number" && object.ContentLength !== expectedSize) {
    throw new Error("Uploaded object size does not match the expected video size");
  }
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
