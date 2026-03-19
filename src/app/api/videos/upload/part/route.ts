import { NextRequest, NextResponse } from "next/server";
import { createPresignedPartUrl } from "@/lib/storage";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const { video, uploadId, partNumber } = await req.json();

    if (!video || !uploadId || !partNumber) {
      return NextResponse.json({ error: "video, uploadId, and partNumber are required" }, { status: 400 });
    }

    // BUG-08 FIX: Verify the video belongs to this tenant to prevent cross-tenant S3 overwrites
    const videoInDb = await (prisma.videos as any).findFirst({
      where: { id: video.id, tenant_id: tenantId },
      select: { id: true },
    });
    if (!videoInDb) {
      return NextResponse.json({ error: "Forbidden: video does not belong to this workspace" }, { status: 403 });
    }

    // Reconstruction of draft for helper
    const draft = {
      id: video.id,
      originalFilename: video.filename,
      fileType: video.file_type,
      storageProvider: video.storage_provider,
      storageKey: video.storage_key,
      filePath: video.file_path,
      publicUrl: video.public_url,
      tenantId,
      fileSize: BigInt(video.file_size),
    };

    const uploadUrl = await createPresignedPartUrl(draft, uploadId, partNumber);

    return NextResponse.json({ uploadUrl });
  } catch (error: any) {
    console.error("Presigned Part URL Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate part URL" }, { status: 500 });
  }
}
