import { prisma } from "@/lib/prisma";

export type PlanLimits = {
    planName: string;
    maxActiveStreams: number;
    maxStorageGB: number;
    maxAiResponsesPerDay: number;
    maxScheduledSessions: number;
    maxTeamMembers: number;
    canUseCustomVoices: boolean;
    maxStreamMinutesPerDay: number; // 0 = blocked, -1 = unlimited
};

type BasePlanLimits = Omit<PlanLimits, 'planName'>;

/**
 * BUG-10 FIX: PLANS hardcode is kept ONLY as a last-resort fallback.
 * The primary source of truth is the `plans` table in the database.
 * Changing plan limits in the Ops Console now takes effect immediately.
 */
const PLANS_FALLBACK: Record<string, BasePlanLimits> = {
    "free_trial": {
        maxActiveStreams: 1,
        maxStorageGB: 2,
        maxAiResponsesPerDay: 10,
        maxScheduledSessions: 3,
        maxTeamMembers: 1,
        canUseCustomVoices: false,
        maxStreamMinutesPerDay: 180, // 3 hours
    },
    "creator": {
        maxActiveStreams: 1,
        maxStorageGB: 5,
        maxAiResponsesPerDay: 100,
        maxScheduledSessions: 5,
        maxTeamMembers: 2,
        canUseCustomVoices: false,
        maxStreamMinutesPerDay: -1, // unlimited
    },
    "studio": {
        maxActiveStreams: 3,
        maxStorageGB: 20,
        maxAiResponsesPerDay: 1000,
        maxScheduledSessions: 20,
        maxTeamMembers: 5,
        canUseCustomVoices: true,
        maxStreamMinutesPerDay: -1,
    },
    "agency": {
        maxActiveStreams: 10,
        maxStorageGB: 100,
        maxAiResponsesPerDay: 10000,
        maxScheduledSessions: 100,
        maxTeamMembers: 20,
        canUseCustomVoices: true,
        maxStreamMinutesPerDay: -1,
    }
};

// Keep PLANS exported for backward compatibility with any code referencing it
export const PLANS = PLANS_FALLBACK;

/**
 * Resolves the current limits for a tenant based on their active subscription.
 * Always reads from the `plans` DB table as primary source of truth.
 */
export async function getTenantLimits(tenantId: string): Promise<PlanLimits> {
    const now = new Date();
    const [tenant, subscription] = await Promise.all([
        (prisma as any).tenants.findUnique({
            where: { id: tenantId },
            select: { max_stream_minutes_override: true }
        }),
        (prisma as any).subscriptions.findFirst({
            where: { 
                tenant_id: tenantId, 
                status: { in: ["active", "trialing"] },
            },
            orderBy: { created_at: "desc" }
        })
    ]);

    const isTrial = subscription?.plan_code === "free_trial" || !subscription;
    const trialExpired = isTrial && subscription?.trial_ends_at && new Date(subscription.trial_ends_at) < now;
    
    // If trial is expired, we default to a "blocked" version of free_trial
    const planCode = trialExpired ? "expired" : (subscription?.plan_code || "free_trial");

    // BUG-10: Always load plan from DB first — this is the single source of truth.
    // This ensures changes made via Ops Console take effect immediately.
    const dbPlan = await (prisma as any).plans.findUnique({
        where: { code: planCode }
    });

    // Fall back to hardcode only if the plan doesn't exist in DB at all
    let fallback = PLANS_FALLBACK[planCode] || PLANS_FALLBACK["free_trial"];
    
    // If explicitly expired, override limits to zero
    if (planCode === "expired") {
        fallback = {
            maxActiveStreams: 0,
            maxStorageGB: 0,
            maxAiResponsesPerDay: 0,
            maxScheduledSessions: 0,
            maxTeamMembers: 1,
            canUseCustomVoices: false,
            maxStreamMinutesPerDay: 0,
        };
    }

    const baseLimits: PlanLimits = {
        planName: dbPlan?.name || planCode,
        maxActiveStreams: dbPlan?.max_active_streams ?? fallback.maxActiveStreams,
        maxStorageGB: dbPlan?.max_storage_gb ?? fallback.maxStorageGB,
        maxAiResponsesPerDay: dbPlan?.max_ai_responses_day ?? fallback.maxAiResponsesPerDay,
        maxScheduledSessions: dbPlan?.max_scheduled_sessions ?? fallback.maxScheduledSessions,
        maxTeamMembers: dbPlan?.max_team_members ?? fallback.maxTeamMembers,
        canUseCustomVoices: dbPlan?.can_use_custom_voices ?? fallback.canUseCustomVoices,
        maxStreamMinutesPerDay: tenant?.max_stream_minutes_override ?? dbPlan?.max_stream_minutes_per_day ?? fallback.maxStreamMinutesPerDay,
    };

    // Apply dynamic trial overrides from system_settings (only if no DB plan found)
    if (planCode === "free_trial" && !dbPlan) {
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
            const message = limits.planName === "expired" 
                ? "Masa trial Anda telah habis. Silakan hubungi admin atau beli paket langganan untuk melanjutkan streaming."
                : `Anda telah mencapai batas maksimum ${limits.maxActiveStreams} stream aktif untuk paket ini. Silakan upgrade untuk menambah kapasitas.`;
            
            return { allowed: false, message };
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
            where: {
                tenant_id: tenantId,
                status: { in: ["IDLE", "LIVE"] }
            }
        });

        if (sessionCount >= limits.maxScheduledSessions) {
            const message = limits.planName === "expired"
                ? "Masa trial Anda telah habis. Anda tidak dapat membuat sesi atau jadwal baru."
                : `Anda telah mencapai batas maksimum ${limits.maxScheduledSessions} sesi/jadwal. Silakan hapus sesi lama atau upgrade paket Anda.`;
            
            return { allowed: false, message };
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
            const message = limits.planName === "expired"
                ? "Masa trial Anda telah habis. Kapasitas penyimpanan Anda telah dikunci. Silakan upgrade untuk menambah kapasitas."
                : `Anda telah mencapai batas storage ${limits.maxStorageGB}GB. Silakan hapus video lama untuk mengunggah yang baru.`;
            
            return { allowed: false, message };
        }
    }

    return { allowed: true };
}

/**
 * Checks if a tenant has any active PAID subscription (not free trial).
 */
export async function isPaidSubscriber(tenantId: string): Promise<boolean> {
    const subscription = await (prisma as any).subscriptions.findFirst({
        where: { 
            tenant_id: tenantId, 
            status: { in: ["active", "trialing"] },
            plan_code: { not: "free_trial" } 
        }
    });

    return !!subscription;
}

/**
 * Returns how many stream minutes a tenant has used today (midnight-to-midnight).
 */
export async function getStreamMinutesToday(tenantId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await (prisma as any).usage_records.aggregate({
        where: {
            tenant_id: tenantId,
            metric: "stream_minutes",
            created_at: { gte: startOfDay },
        },
        _sum: { quantity: true },
    });

    return Number(result._sum?.quantity || 0);
}

/**
 * Checks if a tenant has exhausted their daily streaming allowance.
 * Returns { allowed: boolean, minutesUsed: number, minutesLimit: number }
 */
export async function checkStreamTimeLimit(tenantId: string): Promise<{
    allowed: boolean;
    minutesUsed: number;
    minutesLimit: number;
    message?: string;
}> {
    const limits = await getTenantLimits(tenantId);

    // -1 means unlimited (paid plans)
    if (limits.maxStreamMinutesPerDay === -1) {
        return { allowed: true, minutesUsed: 0, minutesLimit: -1 };
    }

    const minutesUsed = await getStreamMinutesToday(tenantId);

    if (minutesUsed >= limits.maxStreamMinutesPerDay) {
        return {
            allowed: false,
            minutesUsed,
            minutesLimit: limits.maxStreamMinutesPerDay,
            message: `Batas streaming harian (${limits.maxStreamMinutesPerDay} menit) telah tercapai untuk hari ini. Streaming dihentikan otomatis. Upgrade ke paket berbayar untuk streaming tanpa batas.`,
        };
    }

    return { allowed: true, minutesUsed, minutesLimit: limits.maxStreamMinutesPerDay };
}

