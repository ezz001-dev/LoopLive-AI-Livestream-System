import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create public/sounds directory if it doesn't exist
    const uploadDir = join(process.cwd(), "public", "sounds");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Clean filename
    const safeName = file.name.replace(/[^a-z0-9.]/gi, "_").toLowerCase();
    const uniqueName = `${Date.now()}_${safeName}`;
    const path = join(uploadDir, uniqueName);

    await writeFile(path, buffer);
    console.log(`[Upload API] Saved sound to ${path}`);

    const url = `/sounds/${uniqueName}`;
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[Upload API] Error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
