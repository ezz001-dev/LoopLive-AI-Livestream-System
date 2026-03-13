/**
 * Individual Schedule API Routes
 * 
 * PATCH /api/live/[id]/schedule/[scheduleId] - Update a schedule
 * DELETE /api/live/[id]/schedule/[scheduleId] - Delete a schedule
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/live/[id]/schedule/[scheduleId] - Update a schedule
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const { id: sessionId, scheduleId } = await params;

    // Verify schedule exists and belongs to session
    const existingSchedule = await prisma.session_schedules.findFirst({
      where: {
        id: scheduleId,
        live_session_id: sessionId,
      },
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      schedule_type,
      scheduled_at,
      days_of_week,
      start_time,
      end_time,
      timezone,
      active,
      repeat_end_date,
      scheduled_end_at,
    } = body;

    // Validation for schedule_type if being updated
    if (schedule_type && !["one-time", "repeat"].includes(schedule_type)) {
      return NextResponse.json(
        { error: "Invalid schedule_type. Must be 'one-time' or 'repeat'" },
        { status: 400 }
      );
    }

    // Validation: scheduled_at cannot be in the past
    if (scheduled_at) {
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

    // Build update data
    const updateData: any = {};

    if (schedule_type !== undefined) {
      updateData.schedule_type = schedule_type;
    }
    
    if (scheduled_at !== undefined) {
      updateData.scheduled_at = scheduled_at ? new Date(scheduled_at) : null;
    }

    if (scheduled_end_at !== undefined) {
      updateData.scheduled_end_at = scheduled_end_at ? new Date(scheduled_end_at) : null;
    }
    
    if (days_of_week !== undefined) {
      updateData.days_of_week = Array.isArray(days_of_week) 
        ? JSON.stringify(days_of_week) 
        : null;
    }
    
    if (start_time !== undefined) {
      updateData.start_time = start_time;
    }
    
    if (end_time !== undefined) {
      updateData.end_time = end_time;
    }
    
    if (timezone !== undefined) {
      updateData.timezone = timezone;
    }
    
    if (active !== undefined) {
      updateData.active = active;
    }
    
    if (repeat_end_date !== undefined) {
      updateData.repeat_end_date = repeat_end_date ? new Date(repeat_end_date) : null;
    }

    // Update the schedule
    const updatedSchedule = await prisma.session_schedules.update({
      where: { id: scheduleId },
      data: updateData,
    });

    // Parse days_of_week for response
    const daysOfWeek = updatedSchedule.days_of_week
      ? JSON.parse(updatedSchedule.days_of_week)
      : [];

    return NextResponse.json({
      success: true,
      schedule: {
        ...updatedSchedule,
        days_of_week: daysOfWeek,
      },
    });
  } catch (error: any) {
    console.error("[Schedule API] PATCH Error:", error.message);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    );
  }
}

// DELETE /api/live/[id]/schedule/[scheduleId] - Delete a schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const { id: sessionId, scheduleId } = await params;

    // Verify schedule exists and belongs to session
    const existingSchedule = await prisma.session_schedules.findFirst({
      where: {
        id: scheduleId,
        live_session_id: sessionId,
      },
    });

    if (!existingSchedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    // Delete the schedule
    await prisma.session_schedules.delete({
      where: { id: scheduleId },
    });

    // Check if there are any remaining schedules for this session
    const remainingSchedules = await prisma.session_schedules.findMany({
      where: { live_session_id: sessionId },
    });

    // If no more schedules, disable schedule on the session
    if (remainingSchedules.length === 0) {
      await prisma.live_sessions.update({
        where: { id: sessionId },
        data: { schedule_enabled: false },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Schedule deleted successfully",
    });
  } catch (error: any) {
    console.error("[Schedule API] DELETE Error:", error.message);
    return NextResponse.json(
      { error: "Failed to delete schedule" },
      { status: 500 }
    );
  }
}
