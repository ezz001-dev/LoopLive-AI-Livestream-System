/**
 * Schedule Worker
 * 
 * Checks for scheduled live streams every minute and executes start/stop
 * by calling the Next.js API endpoints (since FFmpeg processes live in the app process).
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

console.log("[Scheduler] Starting Schedule Worker...");
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
        return nowMinutes >= startMinutes || nowMinutes < endMinutes;
    }
}

function shouldExecuteOneTime(session: any, now: Date): 'start' | 'stop' | null {
    if (!session.schedule_enabled || session.schedule_type !== 'one-time') {
        return null;
    }
    
    if (!session.schedule_start_at) {
        console.log(`[Scheduler]   → No schedule_start_at set, skipping`);
        return null;
    }
    
    const scheduleStart = new Date(session.schedule_start_at);
    const scheduleEnd = session.schedule_end_at ? new Date(session.schedule_end_at) : null;
    const currentStatus = session.status;
    
    console.log(`[Scheduler]   → One-time check: now=${now.toLocaleTimeString('id-ID')}, start=${scheduleStart.toLocaleTimeString('id-ID')}, end=${scheduleEnd?.toLocaleTimeString('id-ID') || 'none'}, status=${currentStatus}`);
    
    if (scheduleEnd) {
        if (now >= scheduleEnd) {
            // Past end time
            if (currentStatus === 'LIVE') {
                console.log(`[Scheduler]   → DECISION: STOP (past end time, currently LIVE)`);
                return 'stop';
            }
            console.log(`[Scheduler]   → Past end time but status=${currentStatus}, no action`);
            return null;
        }
        
        if (now >= scheduleStart && now < scheduleEnd) {
            // Within window
            if (currentStatus !== 'LIVE') {
                console.log(`[Scheduler]   → DECISION: START (within window, not LIVE)`);
                return 'start';
            }
            console.log(`[Scheduler]   → Within window, already LIVE, no action`);
            return null;
        }
        
        console.log(`[Scheduler]   → Before start time, no action`);
        return null;
    }
    
    // No end time
    if (now >= scheduleStart) {
        const diffMs = now.getTime() - scheduleStart.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        
        if (diffMinutes >= 0 && diffMinutes < 2 && currentStatus !== 'LIVE') {
            console.log(`[Scheduler]   → DECISION: START (within 2min of start, no end time)`);
            return 'start';
        }
    }
    
    return null;
}

function shouldExecuteRepeat(session: any, now: Date): 'start' | 'stop' | null {
    if (!session.schedule_enabled || session.schedule_type !== 'repeat') {
        return null;
    }
    
    let days: string[] = [];
    try {
        days = session.schedule_days ? JSON.parse(session.schedule_days) : [];
    } catch {
        days = [];
    }
    
    if (!days.length || !session.schedule_start_time || !session.schedule_end_time) {
        console.log(`[Scheduler]   → Repeat: Missing days/start_time/end_time, skipping`);
        return null;
    }
    
    const today = getDayName(now);
    const currentStatus = session.status;
    
    console.log(`[Scheduler]   → Repeat check: today=${today}, days=${days.join(',')}, time=${session.schedule_start_time}-${session.schedule_end_time}, status=${currentStatus}`);
    
    if (!days.includes(today)) {
        if (currentStatus === 'LIVE') {
            console.log(`[Scheduler]   → DECISION: STOP (not a scheduled day)`);
            return 'stop';
        }
        console.log(`[Scheduler]   → Not a scheduled day, no action`);
        return null;
    }
    
    if (session.schedule_repeat_end) {
        const repeatEnd = new Date(session.schedule_repeat_end);
        if (now > repeatEnd) {
            if (currentStatus === 'LIVE') {
                console.log(`[Scheduler]   → DECISION: STOP (past repeat end date)`);
                return 'stop';
            }
            return null;
        }
    }
    
    const inRange = isTimeInRange(now, session.schedule_start_time, session.schedule_end_time);
    console.log(`[Scheduler]   → In time range: ${inRange}`);
    
    if (inRange && currentStatus !== 'LIVE') {
        console.log(`[Scheduler]   → DECISION: START (in range, not LIVE)`);
        return 'start';
    }
    
    if (!inRange && currentStatus === 'LIVE') {
        console.log(`[Scheduler]   → DECISION: STOP (out of range, currently LIVE)`);
        return 'stop';
    }
    
    console.log(`[Scheduler]   → No action needed`);
    return null;
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
                data: { last_scheduled_run: new Date() } as any
            });
        } else {
            console.error(`[Scheduler] ❌ ${action.toUpperCase()} failed (${response.status}):`, JSON.stringify(data));
        }
        
    } catch (error: any) {
        console.error(`[Scheduler] ❌ Error calling ${action} API for ${sessionId}:`, error.message);
    }
}

async function checkSchedules() {
    try {
        const now = new Date();
        
        const scheduledSessions = await prisma.live_sessions.findMany({
            where: {
                schedule_enabled: true
            } as any
        }) as any[];
        
        if (scheduledSessions.length === 0) {
            return;
        }
        
        console.log(`[Scheduler] ── Check at ${now.toLocaleTimeString('id-ID')} (${scheduledSessions.length} sessions) ──`);
        
        for (const session of scheduledSessions) {
            console.log(`[Scheduler] Session: "${session.title}" (${session.id.slice(0,8)}...) type=${session.schedule_type} status=${session.status}`);
            
            let action: 'start' | 'stop' | null = null;
            
            if (session.schedule_type === 'one-time') {
                action = shouldExecuteOneTime(session, now);
            } else if (session.schedule_type === 'repeat') {
                action = shouldExecuteRepeat(session, now);
            }
            
            if (action) {
                console.log(`[Scheduler] 🎯 Executing ${action.toUpperCase()} for: ${session.title}`);
                await executeAction(session.id, action);
            }
        }
        
    } catch (error: any) {
        console.error("[Scheduler] Error checking schedules:", error.message);
    }
}

// Main loop
async function startScheduler() {
    console.log("[Scheduler] ✅ Scheduler started");
    
    await checkSchedules();
    
    setInterval(async () => {
        await checkSchedules();
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
