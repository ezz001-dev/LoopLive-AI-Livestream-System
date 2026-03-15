import { prisma } from "./prisma";

/**
 * Record a usage metric for a tenant.
 */
export async function recordUsage(
  tenantId: string,
  metric: "stream_minutes" | "storage_gb" | "ai_responses" | "tts_seconds",
  quantity: number,
  metadata?: any
) {
  try {
    const now = new Date();
    // Use current month as period
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return await (prisma as any).usage_records.create({
      data: {
        tenant_id: tenantId,
        metric,
        quantity: quantity,
        period_start: periodStart,
        period_end: periodEnd,
        metadata: metadata || {},
      },
    });
  } catch (error: any) {
    console.error(`[Usage] Failed to record ${metric} for tenant ${tenantId}:`, error.message);
  }
}
