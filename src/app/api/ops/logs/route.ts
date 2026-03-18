import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { level, message, stack, component, metadata, tenantId } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const session = await getAuthSession();
    const userId = session?.userId;

    const log = await (prisma as any).tenant_logs.create({
      data: {
        tenant_id: tenantId || session?.tenantId || null,
        user_id: userId || null,
        level: level || "error",
        message,
        stack: stack || null,
        component: component || null,
        metadata: metadata || {},
      },
    });

    return NextResponse.json(log);
  } catch (err: any) {
    console.error("[OpsLogsAPI] Error saving log:", err);
    return NextResponse.json({ error: "Failed to save log" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "50");
        const tenantId = searchParams.get("tenantId");

        const logs = await (prisma as any).tenant_logs.findMany({
            where: tenantId ? { tenant_id: tenantId } : {},
            orderBy: { created_at: "desc" },
            take: limit,
            include: {
                tenant: {
                    select: { name: true, slug: true }
                },
                user: {
                    select: { display_name: true, email: true }
                }
            }
        });

        return NextResponse.json(logs);
    } catch (err) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
