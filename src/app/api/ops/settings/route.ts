import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session || !session.canAccessOps) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await (prisma as any).system_settings.findFirst();
    return NextResponse.json(settings || {});
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || !session.canAccessOps) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const settings = await (prisma as any).system_settings.findFirst();

    if (!settings) {
      // Create if doesn't exist (initial backfill check)
      const newSettings = await (prisma as any).system_settings.create({
        data: body,
      });
      return NextResponse.json(newSettings);
    }

    const updated = await (prisma as any).system_settings.update({
      where: { id: settings.id },
      data: body,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
