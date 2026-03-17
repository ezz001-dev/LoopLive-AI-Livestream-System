import { NextResponse } from "next/server";
import { createPresignedVideoUploadUrl, createVideoUploadDraft, startMultipartUpload } from "@/lib/storage";
import { getStorageProvider } from "@/lib/storage-config";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { checkPlanLimit } from "@/lib/limits";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  try {
    const tenantId = await getCurrentTenantId();
    const { filename, fileType, fileSize } = await req.json();

    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "filename is required" }, { status: 400 });
    }

    if (!fileType || typeof fileType !== "string" || !fileType.startsWith("video/")) {
      return NextResponse.json({ error: "A valid video content type is required" }, { status: 400 });
    }

    if (!fileSize || typeof fileSize !== "number" || fileSize <= 0) {
      return NextResponse.json({ error: "fileSize must be a positive number" }, { status: 400 });
    }

    // --- Plan Limit Guard Rail ---
    const limitCheck = await checkPlanLimit(tenantId, "maxStorageGB");
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message }, { status: 403 });
    }

    const draft = await createVideoUploadDraft({ filename, fileType, fileSize, tenantId });

    if ((await getStorageProvider(tenantId)) !== "r2") {
      return NextResponse.json({
        uploadStrategy: "server-proxy",
        storageProvider: draft.storageProvider,
      });
    }

    const uploadId = await startMultipartUpload(draft);

    return NextResponse.json({
      uploadStrategy: "multipart-r2",
      storageProvider: draft.storageProvider,
      uploadId,
      video: {
        id: draft.id,
        filename: draft.originalFilename,
        file_type: draft.fileType,
        file_size: draft.fileSize.toString(),
        storage_provider: draft.storageProvider,
        storage_key: draft.storageKey,
        file_path: draft.filePath,
        public_url: draft.publicUrl,
      },
    });
  } catch (error: any) {
    console.error("Init Video Upload Error:", error);
    return NextResponse.json({ error: error.message || "Failed to initialize upload" }, { status: 500 });
  }
}
