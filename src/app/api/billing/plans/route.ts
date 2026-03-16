import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-session";

export async function GET() {
    try {
        const session = await getAuthSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const plans = await (prisma as any).plans.findMany({
            where: { active: true },
            orderBy: { created_at: "asc" }
        });
        
        return NextResponse.json(plans);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
