/**
 * Schedule Worker (Multi-Schedule Support)
 * 
 * Checks for scheduled live streams every 30 seconds and executes start/stop
 * by calling the Next.js API endpoints.
 * 
 * Supports TWO sources:
 * 1. Legacy: schedule fields directly on live_sessions table
 * 2. NEW: Multiple schedules from session_schedules table
 * 
 * Run: npm run scheduler
 * Or: npx tsx src/lib/scheduler-worker.ts
 */

import { prisma } from "./prisma";
import * as dotenv from "dotenv";

dotenv.config();

const CHECK_INTERVAL = 30 * 1000; // 30 seconds (more responsive)
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const SCHEDULER_API_KEY = process.env.SCHEDULER_API_KEY || "looplive-scheduler-internal-key";

console.log("[Scheduler] Starting Multi-Schedule Worker...");
console.log("[Scheduler] App URL:", APP_BASE_URL);
console.log("[Scheduler] Check interval:", CHECK_INTERVAL / 1000, "seconds");

// Day name mapping
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function getDayName(date: Date): string {
    return DAYS[date.getDay()];
}

function isTimeInRange(now: Date, startTime: string, endTime: string): boolean {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    if (startMinutes <= endMinutes) {
        return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    } else {
        // Crosses midnight (e.g., 22:00 to 06:00)
        return nowMinutes >= startMinutes || nowMinutes < endMinutes;
    }
}

/**
 * Check if the session should be RUNNING based on its schedules.
 * Returns true if at least one active schedule matches the current time.
 */
function isSessionScheduledNow(sessionSchedules: any[], now: Date): boolean {
    const activeSchedules = sessionSchedules.filter(s => s.active);
    
    if (activeSchedules.length === 0) return false;

    for (const schedule of activeSchedules) {
        // 1. One-time Schedule check
        if (schedule.schedule_type === 'one-time') {
            if (!schedule.scheduled_at) continue;
            
            const scheduleStart = new Date(schedule.scheduled_at);
            
            if (schedule.scheduled_end_at) {
                const scheduleEnd = new Date(schedule.scheduled_end_at);
                if (now >= scheduleStart && now < scheduleEnd) {
                    return true;
                }
            } else {
                // Legacy one-time behavior or no end date: 
                // Matches if we are within a 2-minute window after the scheduled time
                const diffMs = now.getTime() - scheduleStart.getTime();
                const diffMinutes = diffMs / (1000 * 60);
                
                if (diffMinutes >= 0 && diffMinutes < 2) {
                    return true;
                }
            }
        } 
        // 2. Repeat Schedule check
        else if (schedule.schedule_type === 'repeat') {
            let days: string[] = [];
            try {
                days = schedule.days_of_week ? JSON.parse(schedule.days_of_week) : [];
            } catch {
                days = [];
            }
            
            if (!days.length || !schedule.start_time || !schedule.end_time) continue;
            
            // Check repeat end date
            if (schedule.repeat_end_date) {
                const repeatEnd = new Date(schedule.repeat_end_date);
                if (now > repeatEnd) continue;
            }

            const today = getDayName(now);
            if (!days.includes(today)) continue;
            
            // Check if in time range
            if (isTimeInRange(now, schedule.start_time, schedule.end_time)) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Execute start/stop by calling the Next.js API endpoints.
 */
async function executeAction(sessionId: string, action: 'start' | 'stop') {
    try {
        const url = `${APP_BASE_URL}/api/live/${sessionId}/${action}`;
        console.log(`[Scheduler] 🔄 Calling API: POST ${url}`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-scheduler-key': SCHEDULER_API_KEY,
            },
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log(`[Scheduler] ✅ ${action.toUpperCase()} successful for session ${sessionId}`);
            
            await prisma.live_sessions.update({
                where: { id: sessionId },
                data: { last_scheduled_run: new Date() }
            });
        } else {
            console.error(`[Scheduler] ❌ ${action.toUpperCase()} failed (${response.status}):`, JSON.stringify(data));
        }
        
    } catch (error: any) {
        console.error(`[Scheduler] ❌ Error calling ${action} API for ${sessionId}:`, error.message);
    }
}

/**
 * Check schedules from the NEW session_schedules table (multi-schedule)
 */
async function checkNewSchedules() {
    try {
        const now = new Date();
        
        // Get all sessions that have at least one schedule in the new table
        const sessionsWithSchedules = await prisma.live_sessions.findMany({
            where: {
                schedule_enabled: true
            },
            include: {
                schedules: true
            }
        });
        
        if (sessionsWithSchedules.length === 0) {
            return;
        }
        
        console.log(`[Scheduler] ── Multi-Schedule Check at ${now.toLocaleTimeString('id-ID')} (${sessionsWithSchedules.length} sessions) ──`);
        
        for (const session of sessionsWithSchedules) {
            const schedules = session.schedules as any[];
            
            if (schedules.length === 0) {
                continue;
            }
            
            console.log(`[Scheduler] Session: "${session.title}" (${session.id.slice(0,8)}...) status=${session.status}, schedules=${schedules.length}`);
            
            const shouldBeRunning = isSessionScheduledNow(schedules, now);
            
            if (session.status !== 'LIVE' && shouldBeRunning) {
                console.log(`[Scheduler] 🎯 DECISION: START (scheduled now, not LIVE)`);
                await executeAction(session.id, 'start');
            } else if (session.status === 'LIVE' && !shouldBeRunning) {
                console.log(`[Scheduler] 🎯 DECISION: STOP (not scheduled now, currently LIVE)`);
                await executeAction(session.id, 'stop');
            } else {
                console.log(`[Scheduler]   → No action needed (status=${session.status}, shouldBeRunning=${shouldBeRunning})`);
            }
        }
        
    } catch (error: any) {
        console.error("[Scheduler] Error checking multi-schedules:", error.message);
    }
}

/**
 * Legacy support: Check schedules from old live_sessions fields
 * Note: These now use the same unified logic by being treated as a single schedule
 */
async function checkLegacySchedules() {
    try {
        const now = new Date();
        
        // Get sessions with legacy schedule fields enabled
        const legacySessions = await prisma.live_sessions.findMany({
            where: {
                schedule_enabled: true,
            }
        });
        
        // Filter to only process legacy schedules
        const sessionsToProcess = [];
        for (const session of legacySessions) {
            const newSchedules = await prisma.session_schedules.findMany({
                where: { live_session_id: session.id }
            });
            // ONLY process if no new schedules exist (backward compatibility)
            if (newSchedules.length === 0) {
                sessionsToProcess.push(session);
            }
        }
        
        if (sessionsToProcess.length === 0) {
            return;
        }
        
        console.log(`[Scheduler] ── Legacy Schedule Check (${sessionsToProcess.length} sessions) ──`);
        
        for (const session of sessionsToProcess as any[]) {
            console.log(`[Scheduler] Legacy: "${session.title}" type=${session.schedule_type}`);
            
            // Convert legacy fields to a virtual schedule object to use isSessionScheduledNow
            const virtualSchedule = {
                active: true,
                schedule_type: session.schedule_type,
                scheduled_at: session.schedule_start_at,
                days_of_week: session.schedule_days,
                start_time: session.schedule_start_time,
                end_time: session.schedule_end_time,
                repeat_end_date: session.schedule_repeat_end
            };

            const shouldBeRunning = isSessionScheduledNow([virtualSchedule], now);
            
            if (session.status !== 'LIVE' && shouldBeRunning) {
                console.log(`[Scheduler] 🎯 Executing START for legacy: ${session.title}`);
                await executeAction(session.id, 'start');
            } else if (session.status === 'LIVE' && !shouldBeRunning) {
                console.log(`[Scheduler] 🎯 Executing STOP for legacy: ${session.title}`);
                await executeAction(session.id, 'stop');
            }
        }
        
    } catch (error: any) {
        console.error("[Scheduler] Error checking legacy schedules:", error.message);
    }
}

// Main check function
async function checkAllSchedules() {
    // First check new multi-schedule table
    await checkNewSchedules();
    
    // Then check legacy fields for backward compatibility
    await checkLegacySchedules();
}

// Main loop
async function startScheduler() {
    console.log("[Scheduler] ✅ Multi-Schedule Worker started");
    
    await checkAllSchedules();
    
    setInterval(async () => {
        await checkAllSchedules();
    }, CHECK_INTERVAL);
}

process.on('SIGINT', () => {
    console.log("[Scheduler] Shutting down...");
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log("[Scheduler] Shutting down...");
    process.exit(0);
});

startScheduler();
