/**
 * Schedule Worker (Multi-Schedule Support)
 * 
 * Checks for scheduled live streams every 30 seconds and executes start/stop
 * by calling the Next.js API endpoints.
 */

import { prisma } from "./prisma";
import * as dotenv from "dotenv";

dotenv.config();

const CHECK_INTERVAL = 30 * 1000; // 30 seconds

let APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
let SCHEDULER_API_KEY = process.env.SCHEDULER_API_KEY || "looplive-scheduler-internal-key";

async function refreshSettings() {
    try {
        const settings = await prisma.system_settings.findUnique({ where: { id: "1" } });
        if (settings) {
            APP_BASE_URL = (settings as any).app_base_url || APP_BASE_URL;
            SCHEDULER_API_KEY = (settings as any).scheduler_api_key || SCHEDULER_API_KEY;
        }
    } catch (err: any) {
        console.error("[Scheduler] Error fetching settings:", err.message);
    }
}

console.log("[Scheduler] Starting Multi-Schedule Worker (Platform Wide)...");

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
        return nowMinutes >= startMinutes || nowMinutes < endMinutes;
    }
}

function isSessionScheduledNow(sessionSchedules: any[], now: Date): boolean {
    const activeSchedules = sessionSchedules.filter(s => s.active);
    if (activeSchedules.length === 0) return false;

    for (const schedule of activeSchedules) {
        if (schedule.schedule_type === 'one-time') {
            if (!schedule.scheduled_at) continue;
            const scheduleStart = new Date(schedule.scheduled_at);
            if (schedule.scheduled_end_at) {
                const scheduleEnd = new Date(schedule.scheduled_end_at);
                if (now >= scheduleStart && now < scheduleEnd) return true;
            } else {
                const diffMs = now.getTime() - scheduleStart.getTime();
                const diffMinutes = diffMs / (1000 * 60);
                if (diffMinutes >= 0 && diffMinutes < 2) return true;
            }
        } else if (schedule.schedule_type === 'repeat') {
            let days: string[] = [];
            try {
                days = schedule.days_of_week ? JSON.parse(schedule.days_of_week) : [];
            } catch {
                days = [];
            }
            if (!days.length || !schedule.start_time || !schedule.end_time) continue;
            if (schedule.repeat_end_date) {
                const repeatEnd = new Date(schedule.repeat_end_date);
                if (now > repeatEnd) continue;
            }
            const today = getDayName(now);
            if (days.includes(today) && isTimeInRange(now, schedule.start_time, schedule.end_time)) {
                return true;
            }
        }
    }
    return false;
}

async function executeAction(sessionId: string, action: 'start' | 'stop') {
    try {
        const url = `${APP_BASE_URL}/api/live/${sessionId}/${action}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-scheduler-key': SCHEDULER_API_KEY,
            },
        });
        
        if (response.ok) {
            console.log(`[Scheduler] ✅ ${action.toUpperCase()} successful for session ${sessionId}`);
            await prisma.live_sessions.update({
                where: { id: sessionId },
                data: { last_scheduled_run: new Date() }
            });
        } else {
            console.error(`[Scheduler] ❌ ${action.toUpperCase()} failed for ${sessionId}`);
        }
    } catch (error: any) {
        console.error(`[Scheduler] ❌ Error calling ${action} for ${sessionId}:`, error.message);
    }
}

async function checkAllSchedules() {
    await refreshSettings();
    const now = new Date();

    try {
        // Fetch ALL sessions with schedules enabled across ALL tenants
        const sessions = await (prisma.live_sessions as any).findMany({
            where: { schedule_enabled: true },
            include: { schedules: true }
        });

        if (sessions.length > 0) {
            console.log(`[Scheduler] ── Platform Check at ${now.toLocaleTimeString('id-ID')} (${sessions.length} sessions) ──`);
        }

        for (const session of sessions) {
            let schedules = session.schedules as any[];
            
            // Backwards compatibility: if no new schedules, use legacy fields
            if (schedules.length === 0) {
                schedules = [{
                    active: true,
                    schedule_type: session.schedule_type,
                    scheduled_at: session.schedule_start_at,
                    days_of_week: session.schedule_days,
                    start_time: session.schedule_start_time,
                    end_time: session.schedule_end_time,
                    repeat_end_date: session.schedule_repeat_end
                }];
            }

            const shouldBeRunning = isSessionScheduledNow(schedules, now);
            
            if (session.status !== 'LIVE' && shouldBeRunning) {
                await executeAction(session.id, 'start');
            } else if (session.status === 'LIVE' && !shouldBeRunning) {
                await executeAction(session.id, 'stop');
            }
        }
    } catch (error: any) {
        console.error("[Scheduler] Main Run Error:", error.message);
    }
}

async function startScheduler() {
    console.log("[Scheduler] ✅ Multi-Schedule Worker started (Platform Wide)");
    await checkAllSchedules();
    setInterval(async () => {
        await checkAllSchedules();
    }, CHECK_INTERVAL);
}

startScheduler();
