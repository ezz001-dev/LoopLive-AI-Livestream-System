import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const tenantId = await getCurrentTenantId();

    const existingSound = await (prisma.sound_events as any).findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true },
    });

    if (!existingSound) {
      return NextResponse.json({ error: "Sound event not found" }, { status: 404 });
    }
    
    const updated = await (prisma.sound_events as any).update({
      where: { id: existingSound.id },
      data: {
        keyword: body.keyword,
        active: body.active,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update sound event" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantId = await getCurrentTenantId();

    const existingSound = await (prisma.sound_events as any).findFirst({
      where: { id, tenant_id: tenantId },
      select: { id: true },
    });

    if (!existingSound) {
      return NextResponse.json({ error: "Sound event not found" }, { status: 404 });
    }

    await prisma.sound_events.delete({ where: { id: existingSound.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete sound event" }, { status: 500 });
  }
}
