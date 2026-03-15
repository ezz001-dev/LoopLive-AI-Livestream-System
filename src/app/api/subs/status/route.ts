import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await getAuthSession();
        if (!session || !session.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const subscription = await (prisma as any).subscriptions.findFirst({
            where: { tenant_id: session.tenantId },
            orderBy: { created_at: "desc" }
        });

        if (!subscription) {
            return NextResponse.json({ subscription: null });
        }

        return NextResponse.json({
            subscription: {
                planCode: subscription.plan_code,
                status: subscription.status,
                trialEndsAt: subscription.trial_ends_at,
                currentPeriodEnd: subscription.current_period_end,
            }
        });
    } catch (error: any) {
        console.error("Subscription Status API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
