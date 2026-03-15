import crypto from "crypto";
import fs from "fs";
import { mkdir } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import {
  assertR2Env,
  getR2SignedReadTtlSeconds,
  getStorageProvider,
  isSignedR2ReadEnabled,
  getTenantR2Config,
  type StorageProvider,
} from "@/lib/storage-config";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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
  tenantId?: string;
};

export type VideoInputSource = {
  input: string;
  isRemote: boolean;
  storageProvider: StorageProvider;
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

async function uploadToR2(file: File, objectKey: string, tenantId: string): Promise<UploadedAsset> {
  const env = await assertR2Env(tenantId);
  const client = await createR2Client(tenantId);

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

export async function uploadVideoAsset(file: File, tenantId?: string) {
  const draft = await createVideoUploadDraft({
    filename: file.name,
    fileType: file.type,
    fileSize: file.size,
    tenantId,
  });

  const uploaded =
    draft.storageProvider === "r2"
      ? await uploadToR2(file, draft.storageKey!, tenantId!)
      : await uploadToLocal(file, draft.storageKey!);

  return {
    id: draft.id,
    ...uploaded,
  };
}

export async function createVideoUploadDraft(input: {
  filename: string;
  fileType: string;
  fileSize: number | bigint;
  tenantId?: string;
}) {
  const assetId = crypto.randomUUID();
  const provider = await getStorageProvider(input.tenantId);
  const objectKey = buildObjectKey("videos", assetId, input.filename);
  const normalizedSize =
    typeof input.fileSize === "bigint" ? input.fileSize : BigInt(input.fileSize);

  if (provider === "r2") {
    const env = await assertR2Env(input.tenantId);
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
      tenantId: input.tenantId,
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
    tenantId: input.tenantId,
  } satisfies VideoUploadDraft;
}

async function createR2Client(tenantId?: string) {
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

export async function createPresignedVideoUploadUrl(draft: VideoUploadDraft) {
  if (draft.storageProvider !== "r2" || !draft.storageKey) {
    throw new Error("Presigned upload is only available for R2 storage");
  }

  const env = await assertR2Env(draft.tenantId);
  const client = await createR2Client(draft.tenantId);

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

  const env = await assertR2Env(draft.tenantId);
  const client = await createR2Client(draft.tenantId);
  const object = await client.send(new HeadObjectCommand({
    Bucket: env.bucketName,
    Key: draft.storageKey,
  }));

  const expectedSize = Number(draft.fileSize);
  if (typeof object.ContentLength === "number" && object.ContentLength !== expectedSize) {
    throw new Error("Uploaded object size does not match the expected video size");
  }
}

export async function createSignedVideoReadUrl(storageKey: string, tenantId?: string) {
  const env = await assertR2Env(tenantId);
  const client = await createR2Client(tenantId);

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: env.bucketName,
      Key: storageKey,
    }),
    { expiresIn: await getR2SignedReadTtlSeconds(tenantId) }
  );
}

export async function deleteStoredVideoAsset(video: {
  file_path: string;
  storage_key?: string | null;
  storage_provider?: string | null;
  tenant_id?: string | null;
}) {
  if (video.storage_provider === "r2" && video.storage_key) {
    const env = await assertR2Env(video.tenant_id || undefined);
    const client = await createR2Client(video.tenant_id || undefined);

    await client.send(
      new DeleteObjectCommand({
        Bucket: env.bucketName,
        Key: video.storage_key,
      })
    );
    return;
  }

  const localPath = video.file_path.startsWith("/videos/")
    ? path.join(process.cwd(), "public", video.file_path.replace(/^\/+/, ""))
    : video.file_path;

  try {
    await fs.promises.unlink(localPath);
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

async function validateRemoteVideoInput(input: string) {
  const response = await fetch(input, {
    method: "HEAD",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Remote video source is not reachable (HTTP ${response.status})`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && !contentType.startsWith("video/") && !contentType.includes("octet-stream")) {
    console.warn(`[Storage] Remote source responded with unexpected content-type: ${contentType}`);
  }
}

export async function resolveVideoInputSource(video: {
  file_path: string;
  storage_key?: string | null;
  storage_provider?: string | null;
  public_url?: string | null;
  tenant_id?: string | null;
}) {
  const storageProvider = (video.storage_provider === "r2" ? "r2" : "local") as StorageProvider;

  if (video.storage_provider === "r2") {
    const input =
      (await isSignedR2ReadEnabled(video.tenant_id || undefined)) && video.storage_key
        ? await createSignedVideoReadUrl(video.storage_key, video.tenant_id || undefined)
        : video.public_url || video.file_path;

    await validateRemoteVideoInput(input);

    return {
      input,
      isRemote: true,
      storageProvider,
    } satisfies VideoInputSource;
  }

  if (video.file_path.startsWith("/videos/")) {
    const input = path.join(process.cwd(), "public", video.file_path.replace(/^\/+/, ""));
    if (!fs.existsSync(input)) {
      throw new Error(`Video file not found: ${input}`);
    }

    return {
      input,
      isRemote: false,
      storageProvider,
    } satisfies VideoInputSource;
  }

  if (!fs.existsSync(video.file_path)) {
    throw new Error(`Video file not found: ${video.file_path}`);
  }

  return {
    input: video.file_path,
    isRemote: false,
    storageProvider,
  } satisfies VideoInputSource;
}
