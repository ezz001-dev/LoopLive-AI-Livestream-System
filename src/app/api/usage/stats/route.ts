import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant-context";
import { startOfDay, subDays, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const tenantId = await getCurrentTenantId();
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    // 1. Fetch raw usage records for the period
    const rawUsage = await (prisma as any).usage_records.findMany({
      where: {
        tenant_id: tenantId,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { created_at: "asc" },
    });

    // 2. Aggregate by day and metric
    const dailyStats: Record<string, Record<string, number>> = {};
    const totals: Record<string, number> = {};

    rawUsage.forEach((record: any) => {
      const dateKey = record.created_at.toISOString().split("T")[0];
      const metric = record.metric;
      const quantity = parseFloat(record.quantity.toString());

      if (!dailyStats[dateKey]) dailyStats[dateKey] = {};
      dailyStats[dateKey][metric] = (dailyStats[dateKey][metric] || 0) + quantity;
      
      totals[metric] = (totals[metric] || 0) + quantity;
    });

    // 3. Format for Chart.js / UI-friendly consumption
    const chartData = Object.entries(dailyStats).map(([date, metrics]) => ({
      date,
      ...metrics
    }));

    return NextResponse.json({
      success: true,
      stats: chartData,
      totals,
      period: {
        start: startDate,
        end: endDate,
        days
      }
    });

  } catch (error: any) {
    console.error("[Usage API] Error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch usage statistics" },
      { status: 500 }
    );
  }
}
