import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorageProvider, isR2StorageEnabled } from "@/lib/storage-config";
import { uploadVideoAsset } from "@/lib/storage";

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

    const uploadedAsset = await uploadVideoAsset(file);

    // Save to Database
    const savedVideo = await prisma.videos.create({
      data: {
        id: uploadedAsset.id,
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
    const videos = await prisma.videos.findMany({
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
      storageProvider: getStorageProvider(),
      r2Enabled: isR2StorageEnabled(),
    });
  } catch (error) {
    console.error("Get Videos Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
