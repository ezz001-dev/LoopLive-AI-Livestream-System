import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;

        const tenant = await (prisma as any).tenants.findUnique({
            where: { id },
            include: {
                settings: true,
                _count: {
                    select: {
                        users: true,
                        videos: true,
                        live_sessions: true,
                    }
                }
            }
        });

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        const [sessions, recentAudits, usage] = await Promise.all([
            (prisma.live_sessions as any).findMany({
                where: { tenant_id: id },
                include: { video: true },
                orderBy: { created_at: "desc" }
            }),
            (prisma as any).audit_logs.findMany({
                where: { tenant_id: id },
                orderBy: { created_at: "desc" },
                take: 20
            }),
            (prisma as any).usage_records.findMany({
                where: { tenant_id: id },
                orderBy: { created_at: "desc" },
                take: 50
            })
        ]);

        return NextResponse.json({
            tenant,
            sessions,
            recentAudits,
            usage
        });

    } catch (error: any) {
        console.error("Ops Tenant API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        const body = await req.json();
        const { status, max_stream_minutes_override } = body;

        const updateData: any = {};
        if (status) {
            if (!["active", "suspended"].includes(status)) {
                return NextResponse.json({ error: "Invalid status" }, { status: 400 });
            }
            updateData.status = status;
        }

        if (max_stream_minutes_override !== undefined) {
            updateData.max_stream_minutes_override = max_stream_minutes_override === "" ? null : parseInt(max_stream_minutes_override);
        }

        const updated = await (prisma as any).tenants.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("Ops Tenant Status Update Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
