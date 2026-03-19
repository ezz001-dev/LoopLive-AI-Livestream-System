import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-session";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: memberId } = await params;
        const session = await getAuthSession();
        if (!session || !session.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Check if the member exists and belongs to this tenant
        const membership = await (prisma as any).tenant_users.findFirst({
            where: {
                id: memberId,
                tenant_id: session.tenantId
            }
        });

        if (!membership) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        // 2. Prevent removing the last owner
        if (membership.role === "owner") {
            const ownerCount = await (prisma as any).tenant_users.count({
                where: {
                    tenant_id: session.tenantId,
                    role: "owner"
                }
            });

            if (ownerCount <= 1) {
                return NextResponse.json({ error: "Tidak dapat menghapus pemilik terakhir workspace." }, { status: 400 });
            }
        }

        // 3. Delete
        await (prisma as any).tenant_users.delete({
            where: { id: memberId }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: memberId } = await params;
        const session = await getAuthSession();
        if (!session || !session.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { role } = await req.json();

        if (!role) {
            return NextResponse.json({ error: "Role is required" }, { status: 400 });
        }

        // 1. Update
        const updated = await (prisma as any).tenant_users.updateMany({
            where: {
                id: memberId,
                tenant_id: session.tenantId
            },
            data: { role }
        });

        if (updated.count === 0) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
