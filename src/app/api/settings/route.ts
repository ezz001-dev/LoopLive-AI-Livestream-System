import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let settings = await prisma.system_settings.findUnique({
      where: { id: "1" },
    });

    if (!settings) {
      // Create default settings if they don't exist
      settings = await (prisma.system_settings as any).create({
        data: {
          id: "1",
          ai_provider: process.env.AI_PROVIDER || "openai",
          tts_provider: process.env.TTS_PROVIDER || "openai",
          yt_channel_handle: process.env.YT_CHANNEL_HANDLE || "",
          redis_url: process.env.REDIS_URL || "redis://localhost:6379",
          max_response_length: 150,
          yt_cookie: "",
          app_base_url: "http://localhost:3000",
          scheduler_api_key: "looplive-scheduler-internal-key"
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("[Settings API] GET Error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    
    // Whitelist allowed fields
    const allowedFields = [
      "openai_api_key",
      "gemini_api_key",
      "ai_provider",
      "tts_provider",
      "yt_channel_handle",
      "tiktok_channel_handle",
      "ai_name",
      "ai_persona",
      "ai_tone_default",
      "mediamtx_host",
      "rtmp_port",
      "hls_port",
      "redis_url",
      "max_response_length",
      "yt_cookie",
      "app_base_url",
      "scheduler_api_key"
    ];

    const updateData: any = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    if (updateData.rtmp_port) updateData.rtmp_port = parseInt(updateData.rtmp_port);
    if (updateData.hls_port) updateData.hls_port = parseInt(updateData.hls_port);
    if (updateData.max_response_length) updateData.max_response_length = parseInt(updateData.max_response_length);

    const updatedSettings = await prisma.system_settings.upsert({
      where: { id: "1" },
      update: updateData,
      create: {
        id: "1",
        ...updateData
      },
    });

    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (error: any) {
    console.error("[Settings API] PATCH Error:", error.message);
    return NextResponse.json(
      { error: `Failed to update settings: ${error.message}` },
      { status: 500 }
    );
  }
}
