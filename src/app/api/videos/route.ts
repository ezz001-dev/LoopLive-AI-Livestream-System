import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorageProvider, isR2StorageEnabled } from "@/lib/storage-config";
import { uploadVideoAsset } from "@/lib/storage";
import { getCurrentTenantId } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300; // Increase to 5 minutes for large uploads

function serializeVideo(video: {
  id: string;
  filename: string;
  file_path: string;
  file_type: string;
  file_size: bigint | null;
  storage_provider: string;
  storage_key?: string | null;
  public_url: string | null;
  created_at: Date;
  updated_at?: Date;
}) {
  return {
    ...video,
    file_size: video.file_size?.toString() ?? null,
  };
}

export async function POST(req: Request) {
  try {
    const tenantId = await getCurrentTenantId();
    const contentType = req.headers.get("content-type") || "";
    
    // Check if it's a multipart form (standard upload)
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Only multipart/form-data is supported" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    // Validate if it is a video
    if (!file.type.startsWith('video/')) {
        return NextResponse.json({ error: "Uploaded file is not a valid video" }, { status: 400 });
    }

    const uploadedAsset = await uploadVideoAsset(file, tenantId);

    // Save to Database
    const savedVideo = await (prisma.videos as any).create({
      data: {
        id: uploadedAsset.id,
        tenant_id: tenantId,
        filename: uploadedAsset.originalFilename,
        file_path: uploadedAsset.filePath,
        file_type: file.type,
        file_size: uploadedAsset.fileSize,
        storage_provider: uploadedAsset.storageProvider,
        storage_key: uploadedAsset.storageKey,
        public_url: uploadedAsset.publicUrl,
      }
    });

    return NextResponse.json(serializeVideo(savedVideo));
    
  } catch (error: any) {
    console.error("Video Upload Error:", error);
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
  }
}

export async function GET() {
  try {
    const tenantId = await getCurrentTenantId();

    const videos = await (prisma.videos as any).findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        filename: true,
        file_type: true,
        file_size: true,
        storage_provider: true,
        file_path: true,
        public_url: true,
        created_at: true,
      }
    });
    return NextResponse.json({
      items: videos.map(serializeVideo),
      storageProvider: await getStorageProvider(tenantId),
      r2Enabled: await isR2StorageEnabled(tenantId),
    });
  } catch (error) {
    console.error("Get Videos Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
