import { prisma } from "@/lib/prisma";

export type PlanLimits = {
    planName: string;
    maxActiveStreams: number;
    maxStorageGB: number;
    maxAiResponsesPerDay: number;
    maxScheduledSessions: number;
    maxTeamMembers: number;
    canUseCustomVoices: boolean;
};

type BasePlanLimits = Omit<PlanLimits, 'planName'>;

export const PLANS: Record<string, BasePlanLimits> = {
    "free_trial": {
        maxActiveStreams: 1,
        maxStorageGB: 2,
        maxAiResponsesPerDay: 10,
        maxScheduledSessions: 3,
        maxTeamMembers: 1,
        canUseCustomVoices: false,
    },
    "creator": {
        maxActiveStreams: 1,
        maxStorageGB: 5,
        maxAiResponsesPerDay: 100,
        maxScheduledSessions: 5,
        maxTeamMembers: 2,
        canUseCustomVoices: false,
    },
    "studio": {
        maxActiveStreams: 3,
        maxStorageGB: 20,
        maxAiResponsesPerDay: 1000,
        maxScheduledSessions: 20,
        maxTeamMembers: 5,
        canUseCustomVoices: true,
    },
    "agency": {
        maxActiveStreams: 10,
        maxStorageGB: 100,
        maxAiResponsesPerDay: 10000,
        maxScheduledSessions: 100,
        maxTeamMembers: 20,
        canUseCustomVoices: true,
    }
};

/**
 * Resolves the current limits for a tenant based on their active subscription.
 */
export async function getTenantLimits(tenantId: string): Promise<PlanLimits> {
    const subscription = await (prisma as any).subscriptions.findFirst({
        where: { tenant_id: tenantId, status: { in: ["active", "trialing"] } },
        include: { plan: true },
        orderBy: { created_at: "desc" }
    });

    const planCode = subscription?.plan_code || "free_trial";
    const baseLimits: PlanLimits = { 
        planName: subscription?.plan?.name || (planCode === "free_trial" ? "Free Trial" : planCode),
        ...(PLANS[planCode] || PLANS["free_trial"]) 
    };

    // If we have a DB plan record, use its values
    if (subscription?.plan) {
        const dbPlan = subscription.plan;
        baseLimits.maxActiveStreams = dbPlan.max_active_streams ?? baseLimits.maxActiveStreams;
        baseLimits.maxStorageGB = dbPlan.max_storage_gb ?? baseLimits.maxStorageGB;
        baseLimits.maxAiResponsesPerDay = dbPlan.max_ai_responses_day ?? baseLimits.maxAiResponsesPerDay;
        baseLimits.maxScheduledSessions = dbPlan.max_scheduled_sessions ?? baseLimits.maxScheduledSessions;
        baseLimits.maxTeamMembers = dbPlan.max_team_members ?? baseLimits.maxTeamMembers;
        baseLimits.canUseCustomVoices = dbPlan.can_use_custom_voices ?? baseLimits.canUseCustomVoices;
    }

    // Apply dynamic trial overrides if applicable (only if on free_trial and NOT specifically managed in plans table)
    // Note: If free_trial is in the plans table, the logic above already handled it.
    // This part is kept for backward compatibility with the trial settings in system_settings.
    if (planCode === "free_trial" && !subscription?.plan) {
        try {
            const settings = await (prisma as any).system_settings.findFirst();
            if (settings) {
                baseLimits.maxTeamMembers = settings.trial_max_users ?? baseLimits.maxTeamMembers;
                baseLimits.maxStorageGB = settings.trial_max_storage_gb ?? baseLimits.maxStorageGB;
                baseLimits.maxActiveStreams = settings.trial_max_active_streams ?? baseLimits.maxActiveStreams;
                baseLimits.maxAiResponsesPerDay = settings.trial_max_ai_responses ?? baseLimits.maxAiResponsesPerDay;
            }
        } catch (error) {
            console.error("Failed to load trial overrides from system_settings", error);
        }
    }

    return baseLimits;
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
        // BYOK users get unlimited AI responses as they use their own keys
        const settings = await (prisma as any).tenant_settings.findUnique({
            where: { tenant_id: tenantId },
            select: { use_client_side_ai: true }
        });

        if (settings?.use_client_side_ai) {
            return { allowed: true };
        }

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

    if (metric === "maxScheduledSessions") {
        const sessionCount = await (prisma as any).live_sessions.count({
            where: { tenant_id: tenantId }
        });

        if (sessionCount >= limits.maxScheduledSessions) {
            return {
                allowed: false,
                message: `Anda telah mencapai batas maksimum ${limits.maxScheduledSessions} sesi/jadwal. Silakan hapus sesi lama atau upgrade paket Anda.`
            };
        }
    }

    if (metric === "maxTeamMembers") {
        const memberCount = await (prisma as any).tenant_users.count({
            where: { tenant_id: tenantId }
        });

        if (memberCount >= limits.maxTeamMembers) {
            return {
                allowed: false,
                message: `Anda telah mencapai batas maksimum ${limits.maxTeamMembers} anggota tim untuk paket ini.`
            };
        }
    }

    if (metric === "maxStorageGB") {
        const videoStats = await (prisma as any).videos.aggregate({
            where: { tenant_id: tenantId },
            _sum: { file_size: true }
        });

        const totalBytes = Number(videoStats._sum?.file_size || 0);
        const totalGB = totalBytes / (1024 * 1024 * 1024);

        if (totalGB >= limits.maxStorageGB) {
            return {
                allowed: false,
                message: `Anda telah mencapai batas storage ${limits.maxStorageGB}GB. Silakan hapus video lama untuk mengunggah yang baru.`
            };
        }
    }

    return { allowed: true };
}
