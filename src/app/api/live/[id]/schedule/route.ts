/**
 * Schedule API Routes
 * 
 * GET /api/live/[id]/schedule - Get all schedules for a session
 * POST /api/live/[id]/schedule - Create a new schedule
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantScopedLiveSession } from "@/lib/tenant-context";

// GET /api/live/[id]/schedule - Get all schedules for a session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // Verify session exists
    const session = await getTenantScopedLiveSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Get all schedules for this session
    const schedules = await prisma.session_schedules.findMany({
      where: { live_session_id: sessionId },
      orderBy: { created_at: "asc" },
    });

    // Parse days_of_week JSON for each schedule
    const schedulesWithParsedDays = schedules.map((schedule) => ({
      ...schedule,
      days_of_week: schedule.days_of_week
        ? JSON.parse(schedule.days_of_week)
        : [],
    }));

    return NextResponse.json({ schedules: schedulesWithParsedDays });
  } catch (error: any) {
    console.error("[Schedule API] GET Error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 }
    );
  }
}

// POST /api/live/[id]/schedule - Create a new schedule
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // Verify session exists
    const session = await getTenantScopedLiveSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      schedule_type,
      scheduled_at,
      scheduled_end_at,
      days_of_week,
      start_time,
      end_time,
      timezone,
      active,
      repeat_end_date,
    } = body;

    // Validation
    if (!schedule_type || !["one-time", "repeat"].includes(schedule_type)) {
      return NextResponse.json(
        { error: "Invalid schedule_type. Must be 'one-time' or 'repeat'" },
        { status: 400 }
      );
    }

    if (schedule_type === "one-time" && !scheduled_at) {
      return NextResponse.json(
        { error: "scheduled_at is required for one-time schedule" },
        { status: 400 }
      );
    }

    if (schedule_type === "one-time" && scheduled_at) {
      const scheduledDate = new Date(scheduled_at);
      const now = new Date();
      // Allow up to 2 minutes in the past for "now" support
      if (scheduledDate.getTime() < now.getTime() - (2 * 60 * 1000)) {
        return NextResponse.json(
          { error: "Start time cannot be in the past" },
          { status: 400 }
        );
      }
    }

    if (schedule_type === "repeat") {
      if (!days_of_week || !Array.isArray(days_of_week) || days_of_week.length === 0) {
        return NextResponse.json(
          { error: "days_of_week is required for repeat schedule" },
          { status: 400 }
        );
      }
      if (!start_time || !end_time) {
        return NextResponse.json(
          { error: "start_time and end_time are required for repeat schedule" },
          { status: 400 }
        );
      }
    }

    // Create the schedule
    const newSchedule = await prisma.session_schedules.create({
      data: {
        live_session_id: sessionId,
        schedule_type,
        scheduled_at: schedule_type === "one-time" ? new Date(scheduled_at) : null,
        scheduled_end_at: (schedule_type === "one-time" && scheduled_end_at) ? new Date(scheduled_end_at) : null,
        days_of_week: schedule_type === "repeat" ? JSON.stringify(days_of_week) : null,
        start_time: schedule_type === "repeat" ? start_time : null,
        end_time: schedule_type === "repeat" ? end_time : null,
        timezone: timezone || "Asia/Jakarta",
        active: active !== false,
        repeat_end_date: repeat_end_date ? new Date(repeat_end_date) : null,
      },
    });

    // Enable schedule on the session
    await prisma.live_sessions.update({
      where: { id: sessionId },
      data: { schedule_enabled: true },
    });

    console.log(`[Schedule API] ✅ Created ${schedule_type} schedule for session ${sessionId}`);

    return NextResponse.json({
      success: true,
      schedule: {
        ...newSchedule,
        days_of_week: days_of_week || [],
      },
    });
  } catch (error: any) {
    console.error("[Schedule API] POST Error:", error.message);
    return NextResponse.json(
      { error: "Failed to create schedule" },
      { status: 500 }
    );
  }
}
