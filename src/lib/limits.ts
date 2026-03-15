import { prisma } from "@/lib/prisma";

export type PlanLimits = {
    maxActiveStreams: number;
    maxStorageGB: number;
    maxAiResponsesPerDay: number;
    canUseCustomVoices: boolean;
};

export const PLANS: Record<string, PlanLimits> = {
    "free_trial": {
        maxActiveStreams: 1,
        maxStorageGB: 1,
        maxAiResponsesPerDay: 10,
        canUseCustomVoices: false,
    },
    "creator": {
        maxActiveStreams: 1,
        maxStorageGB: 1,
        maxAiResponsesPerDay: 50,
        canUseCustomVoices: false,
    },
    "studio": {
        maxActiveStreams: 3,
        maxStorageGB: 10,
        maxAiResponsesPerDay: 500,
        canUseCustomVoices: true,
    },
    "agency": {
        maxActiveStreams: 10,
        maxStorageGB: 50,
        maxAiResponsesPerDay: 10000,
        canUseCustomVoices: true,
    }
};

/**
 * Resolves the current limits for a tenant based on their active subscription.
 */
export async function getTenantLimits(tenantId: string): Promise<PlanLimits> {
    const subscription = await (prisma as any).subscriptions.findFirst({
        where: { tenant_id: tenantId, status: { in: ["active", "trialing"] } },
        orderBy: { created_at: "desc" }
    });

    const planCode = subscription?.plan_code || "free_trial";
    return PLANS[planCode] || PLANS["free_trial"];
}

/**
 * Checks if a specific metric limit has been reached for a tenant.
 * Returns { allowed: boolean, message?: string }
 */
export async function checkPlanLimit(
    tenantId: string, 
    metric: keyof PlanLimits
): Promise<{ allowed: boolean; message?: string }> {
    const limits = await getTenantLimits(tenantId);
    
    if (metric === "maxActiveStreams") {
        const activeCount = await (prisma as any).live_sessions.count({
            where: { tenant_id: tenantId, status: "LIVE" }
        });
        
        if (activeCount >= limits.maxActiveStreams) {
            return { 
                allowed: false, 
                message: `Anda telah mencapai batas maksimum ${limits.maxActiveStreams} stream aktif untuk paket ini. Silakan upgrade untuk menambah kapasitas.` 
            };
        }
    }

    if (metric === "maxAiResponsesPerDay") {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const responseCount = await (prisma as any).usage_records.aggregate({
            where: { 
                tenant_id: tenantId, 
                metric: "ai_responses",
                created_at: { gte: twentyFourHoursAgo }
            },
            _sum: { quantity: true }
        });

        const totalResponses = Number(responseCount._sum?.quantity || 0);
        if (totalResponses >= limits.maxAiResponsesPerDay) {
            return {
                allowed: false,
                message: `Tenant telah mencapai batas ${limits.maxAiResponsesPerDay} respon AI per hari.`
            };
        }
    }

    return { allowed: true };
}
