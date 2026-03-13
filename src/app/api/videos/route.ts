import { NextResponse } from "next/server";
import { mkdir } from "fs/promises";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Readable } from "stream";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300; // Increase to 5 minutes for large uploads

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

    // Generate a unique identifier
    const video_id = crypto.randomUUID();
    const extension = path.extname(file.name) || ".mp4";
    const filename = `${video_id}${extension}`;

    // Define public path
    const uploadDir = path.join(process.cwd(), "public", "videos");
    const filepath = path.join(uploadDir, filename);

    // Create directory if it doesn't exist
    await mkdir(uploadDir, { recursive: true });

    // Use streaming write to disk to avoid buffering in RAM
    const writeStream = fs.createWriteStream(filepath);
    
    // file.stream() returns a ReadableStream (Web Stream)
    // We convert it to a Node.js Readable stream
    const webStream = file.stream();
    const nodeStream = Readable.fromWeb(webStream as any);

    await new Promise((resolve, reject) => {
      nodeStream.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
      nodeStream.on("error", reject);
    });

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
    
  } catch (error: any) {
    console.error("Video Upload Error:", error);
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
  }
}

export async function GET() {
  try {
    const videos = await prisma.videos.findMany({
      orderBy: { created_at: "desc" },
      select: { id: true, filename: true, file_type: true, created_at: true }
    });
    return NextResponse.json(videos);
  } catch (error) {
    console.error("Get Videos Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
