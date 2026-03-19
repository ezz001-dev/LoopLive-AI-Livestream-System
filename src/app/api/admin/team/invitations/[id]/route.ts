import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-session";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: inviteId } = await params;
        const session = await getAuthSession();
        if (!session || !session.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Check if the invitation exists and belongs to this tenant
        const invitation = await (prisma as any).invitations.findFirst({
            where: {
                id: inviteId,
                tenant_id: session.tenantId,
                status: "pending"
            }
        });

        if (!invitation) {
            return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
        }

        // 2. Delete
        await (prisma as any).invitations.delete({
            where: { id: inviteId }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
