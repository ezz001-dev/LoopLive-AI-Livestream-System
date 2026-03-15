import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { workerManager } from "@/lib/worker-manager";
import { logAudit } from "@/lib/audit";
import { getAuthSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = (await params).id;
        
        const session = await (prisma.live_sessions as any).findUnique({
            where: { id },
            select: { id: true, tenant_id: true, status: true }
        });

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // 1. Force kill worker
        try {
            workerManager.stop(id);
        } catch (err) {
            console.warn(`[Ops][Reset] Worker already stopped or failed to stop: ${id}`);
        }

        // 2. Reset status in DB
        await prisma.live_sessions.update({
            where: { id },
            data: { status: "IDLE" }
        });

        // 3. Log Audit
        const authSession = await getAuthSession();
        await logAudit({
            tenantId: session.tenant_id,
            actorUserId: authSession?.userId,
            actorType: "system", // Internal Ops is a system-level override
            action: "RESET_SESSION",
            targetType: "live_session",
            targetId: id,
            metadata: {
                reason: "Administrative Reset via Ops Console",
                previousStatus: session.status
            }
        });

        return NextResponse.json({ success: true, status: "IDLE" });

    } catch (error: any) {
        console.error("Ops Session Reset Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
