import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60; // Increase to 60 seconds


export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    // Validate if it is a video (optional, but good practice MVP)
    if (!file.type.startsWith('video/')) {
        return NextResponse.json({ error: "Uploaded file is not a valid video" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate a unique identifier instead of using original file name to prevent clashes
    const video_id = crypto.randomUUID();
    const extension = path.extname(file.name) || ".mp4";
    const filename = `${video_id}${extension}`;

    // Define public path
    const uploadDir = path.join(process.cwd(), "public", "videos");
    const filepath = path.join(uploadDir, filename);

    // Create directory if it doesn't exist
    await mkdir(uploadDir, { recursive: true });

    // Write file to public/videos/
    await writeFile(filepath, buffer);

    // Save to Database
    const savedVideo = await prisma.videos.create({
      data: {
        id: video_id,
        filename: file.name,
        file_path: `/videos/${filename}`,
        file_type: file.type,
      }
    });

    return NextResponse.json(savedVideo);
    
  } catch (error) {
    console.error("Video Upload Error:", error);
    return NextResponse.json({ error: "Internal Server Error during video upload" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const videos = await prisma.videos.findMany({
      orderBy: { created_at: "desc" },
      select: { id: true, filename: true, file_type: true }
    });
    return NextResponse.json(videos);
  } catch (error) {
    console.error("Get Videos Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
