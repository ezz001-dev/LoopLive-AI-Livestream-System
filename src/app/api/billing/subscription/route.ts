import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-session";

export async function GET() {
    try {
        const session = await getAuthSession();
        if (!session || !session.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const subscription = await (prisma as any).subscriptions.findFirst({
            where: { tenant_id: session.tenantId },
            include: { plan: true },
            orderBy: { created_at: "desc" }
        });
        
        return NextResponse.json(subscription);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
