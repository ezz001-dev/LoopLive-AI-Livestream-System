import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInternalOpsSession } from "@/lib/auth-session";

async function requireInternalOps() {
    const session = await requireInternalOpsSession();
    if (!session) {
        throw new Error("Unauthorized");
    }
}

export async function GET() {
    try {
        await requireInternalOps();
        const plans = await (prisma as any).plans.findMany({
            orderBy: { created_at: "asc" }
        });
        return NextResponse.json(plans);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}

export async function POST(request: Request) {
    try {
        await requireInternalOps();
        const data = await request.json();
        
        const plan = await (prisma as any).plans.create({
            data: {
                code: data.code,
                name: data.name,
                description: data.description,
                price_idr: data.price_idr,
                price_myr: data.price_myr,
                max_active_streams: data.max_active_streams,
                max_storage_gb: data.max_storage_gb,
                max_ai_responses_day: data.max_ai_responses_day,
                max_scheduled_sessions: data.max_scheduled_sessions,
                max_team_members: data.max_team_members,
                can_use_custom_voices: data.can_use_custom_voices,
                active: data.active ?? true
            }
        });
        
        return NextResponse.json(plan);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        await requireInternalOps();
        const data = await request.json();
        const { id, ...updateData } = data;
        
        const plan = await (prisma as any).plans.update({
            where: { id },
            data: updateData
        });
        
        return NextResponse.json(plan);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
