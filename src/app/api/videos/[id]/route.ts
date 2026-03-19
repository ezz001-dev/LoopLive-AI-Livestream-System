import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteStoredVideoAsset } from "@/lib/storage";
import { getTenantScopedVideo } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;

    const video = await getTenantScopedVideo(id, {
      include: {
        sessions: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (video.sessions.length > 0) {
      return NextResponse.json(
        {
          error: `Video is still used by ${video.sessions.length} live session(s). Remove or change those sessions first.`,
        },
        { status: 409 }
      );
    }

    await deleteStoredVideoAsset(video);

    await prisma.videos.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete Video Error:", error);
    return NextResponse.json(
      { error: `Failed to delete video: ${error.message}` },
      { status: 500 }
    );
  }
}
