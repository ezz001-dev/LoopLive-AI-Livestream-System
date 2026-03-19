import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUploadedVideoObject, completeMultipartUpload } from "@/lib/storage";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { recordUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  try {
    const tenantId = await getCurrentTenantId();
    const body = await req.json();

    if (!body?.id || !body?.filename || !body?.file_type || !body?.storage_provider || !body?.file_path) {
      return NextResponse.json({ error: "Missing required video metadata" }, { status: 400 });
    }

    const videoDraft = {
      id: String(body.id),
      originalFilename: String(body.filename),
      fileType: String(body.file_type),
      fileSize: BigInt(body.file_size || 0),
      storageProvider: body.storage_provider === "r2" ? "r2" : "local",
      storageKey: body.storage_key ? String(body.storage_key) : null,
      filePath: String(body.file_path),
      publicUrl: body.public_url ? String(body.public_url) : null,
    } as const;

    const { uploadId, parts } = body;

    if (videoDraft.storageProvider === "r2") {
      if (uploadId && parts && Array.isArray(parts)) {
        // Complete MPU session
        await completeMultipartUpload(videoDraft, uploadId, parts);
      } else {
        // Fallback or verification for single PutObject if not MPU
        await verifyUploadedVideoObject(videoDraft);
      }
    }

    const savedVideo = await (prisma.videos as any).create({
      data: {
        id: videoDraft.id,
        tenant_id: tenantId,
        filename: videoDraft.originalFilename,
        file_path: videoDraft.filePath,
        file_type: videoDraft.fileType,
        file_size: videoDraft.fileSize,
        storage_provider: videoDraft.storageProvider,
        storage_key: videoDraft.storageKey,
        public_url: videoDraft.publicUrl,
      },
    });

    // Record storage usage in GB
    const fileSizeBytes = Number(videoDraft.fileSize);
    if (fileSizeBytes > 0) {
      const fileSizeGb = fileSizeBytes / (1024 * 1024 * 1024);
      await recordUsage(tenantId, "storage_gb", fileSizeGb, {
        videoId: savedVideo.id,
        filename: videoDraft.originalFilename,
      });
    }

    return NextResponse.json({
      ...savedVideo,
      file_size: savedVideo.file_size?.toString() ?? null,
    });
  } catch (error: any) {
    console.error("Complete Video Upload Error:", error);
    return NextResponse.json({ error: error.message || "Failed to finalize upload" }, { status: 500 });
  }
}
