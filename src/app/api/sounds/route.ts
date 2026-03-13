import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sounds = await prisma.sound_events.findMany({
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(sounds);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch sounds" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_type, keyword, audio_url } = body;

    if (!event_type || !audio_url) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sound = await prisma.sound_events.create({
      data: {
        event_type,
        keyword: event_type === "keyword" ? keyword : null,
        audio_url,
      },
    });

    return NextResponse.json(sound);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create sound event" }, { status: 500 });
  }
}
