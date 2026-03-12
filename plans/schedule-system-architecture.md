# Schedule Live System Architecture

## Overview

Sistem schedule untuk auto start dan auto stop live streaming dengan dua mode:

1. **One-time Schedule** - Jadwalkan sekali saja pada tanggal/waktu tertentu
2. **Repeat Schedule** - Jadwalkan berulang (harian/mingguan)

---

## Database Schema Changes

### Option 1: Extended Live Sessions Model

```prisma
model live_sessions {
  // ... existing fields ...

  // Schedule Configuration
  schedule_enabled        Boolean    @default(false)
  schedule_type           String     @default("one-time")  // "one-time" | "repeat"

  // One-time Schedule
  schedule_start_at       DateTime?  // Tanggal & waktu mulai (one-time)
  schedule_end_at         DateTime?  // Tanggal & waktu selesai (one-time)

  // Repeat Schedule
  schedule_days           String?    // JSON array: ["monday","tuesday","wednesday"]
  schedule_start_time     String?    // Format HH:mm (misal: "10:00")
  schedule_end_time       String?    // Format HH:mm (misal: "18:00")
  schedule_timezone      String     @default("Asia/Jakarta")

  // Repeat Options
  schedule_repeat_enabled Boolean    @default(false)
  schedule_repeat_end    DateTime?  // Kapan repeat berhenti (opsional)

  // Status
  next_scheduled_start   DateTime?  // Calculated:下一次 jadwal mulai
  last_scheduled_run     DateTime?  // Last time schedule ran
}
```

### Option 2: Separate Schedule Model (Recommended for flexibility)

```prisma
model live_schedules {
  id                  String   @id @default(uuid())
  live_session_id     String
  live_session        live_sessions @relation(fields: [live_session_id], references: [id])

  // Schedule Type
  schedule_type       String   // "one-time" | "repeat"

  // One-time
  scheduled_at        DateTime?  // Tanggal & waktu spesifik

  // Repeat
  days_of_week        String?    // JSON: ["monday","tuesday","thursday"]
  start_time          String?    // HH:mm
  end_time            String?    // HH:mm

  // Common
  timezone            String   @default("Asia/Jakarta")
  active             Boolean  @default(true)
  repeat_end_date    DateTime?  // Kapan schedule berhenti

  // Metadata
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt

  // Status
  last_run           DateTime?
  next_run           DateTime?
}
```

---

## Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                    SCHEDULE SYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   UI Admin   │───▶│  API Layer  │───▶│   Database   │  │
│  │  (Schedule   │    │  (CRUD)     │    │   (Prisma)   │  │
│  │   Form)      │    │              │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                                       │            │
│         │                                       ▼            │
│         │                              ┌──────────────┐       │
│         │                              │   Scheduler  │       │
│         │                              │   Worker    │       │
│         │                              │  (Interval) │       │
│         │                              └──────────────┘       │
│         │                                       │            │
│         │                                       ▼            │
│         │                              ┌──────────────┐       │
│         │                              │  Worker      │       │
│         │                              │  Manager     │       │
│         │                              │  (Start/Stop)│       │
│         │                              └──────────────┘       │
│         │                                       │            │
│         ▼                                       ▼            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  WORKER MANAGER                       │  │
│  │  - start(sessionId, video, rtmpUrl)                  │  │
│  │  - stop(sessionId)                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Scheduler Worker Logic

```typescript
// src/lib/scheduler-worker.ts

// Check every minute
const CHECK_INTERVAL = 60 * 1000; // 1 minute

async function checkSchedules() {
	const now = new Date();

	// 1. Check One-time Schedules
	const dueOneTime = await prisma.live_schedules.findMany({
		where: {
			schedule_type: 'one-time',
			active: true,
			scheduled_at: {
				lte: now, // <= now
			},
			OR: [
				{ last_run: null },
				{ last_run: { lt: now } }, // Hasn't run yet
			],
		},
	});

	// 2. Check Repeat Schedules
	const dueRepeat = await prisma.live_schedules.findMany({
		where: {
			schedule_type: 'repeat',
			active: true,
			// Match current day and time
		},
	});

	// 3. Execute Start/Stop
	for (const schedule of dueOneTime) {
		await executeSchedule(schedule, 'start');
	}

	for (const schedule of dueRepeat) {
		const shouldRun = isTimeInRange(
			now,
			schedule.start_time,
			schedule.end_time,
		);
		const wasRunning =
			schedule.last_run &&
			isSameDay(schedule.last_run, now) &&
			now.getTime() >= getTimeFromString(schedule.start_time).getTime();

		if (shouldRun && !wasRunning) {
			await executeSchedule(schedule, 'start');
		} else if (!shouldRun && wasRunning) {
			await executeSchedule(schedule, 'stop');
		}
	}
}

async function executeSchedule(schedule: any, action: 'start' | 'stop') {
	const session = await prisma.live_sessions.findUnique({
		where: { id: schedule.live_session_id },
	});

	if (!session) return;

	if (action === 'start') {
		await workerManager.start(session.id, session.video_id, rtmpUrl);
		await prisma.live_sessions.update({
			where: { id: session.id },
			data: { status: 'LIVE' },
		});
	} else {
		await workerManager.stop(session.id);
		await prisma.live_sessions.update({
			where: { id: session.id },
			data: { status: 'STOPPED' },
		});
	}

	// Update last_run
	await prisma.live_schedules.update({
		where: { id: schedule.id },
		data: { last_run: new Date() },
	});
}
```

---

## API Endpoints

### Create Schedule

```
POST /api/live/[id]/schedule
{
  "schedule_type": "one-time" | "repeat",
  // For one-time:
  "scheduled_at": "2026-03-15T10:00:00Z",
  // For repeat:
  "days_of_week": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "start_time": "10:00",
  "end_time": "18:00",
  "timezone": "Asia/Jakarta",
  "repeat_end_date": "2026-12-31T00:00:00Z"
}
```

### Get Schedules

```
GET /api/live/[id]/schedule
```

### Update Schedule

```
PATCH /api/live/[id]/schedule/[scheduleId]
```

### Delete Schedule

```
DELETE /api/live/[id]/schedule/[scheduleId]
```

---

## UI Components

### Schedule Form (in EditSessionModal or separate)

- Schedule Type Toggle: One-time / Repeat
- Date/Time Picker for one-time
- Day selector (checkboxes) for repeat
- Time pickers (start/end)
- Timezone selector
- Repeat end date (optional)

### Schedule List (in Session Detail Page)

- List of all schedules for session
- Status indicator (active/paused)
- Next run time
- Edit/Delete buttons

---

## Implementation Priority

1. **Database Schema** - Add fields to live_sessions
2. **Scheduler Worker** - Core logic (check & execute)
3. **API Endpoints** - CRUD for schedules
4. **UI Components** - Form and list
5. **Testing** - Manual test with dummy schedule

---

## Environment Variables

```bash
# Scheduler
SCHEDULER_ENABLED=true
SCHEDULER_INTERVAL_MS=60000  # Check every minute
```

---

## PM2 Ecosystem Update

```javascript
// ecosystem.config.js
module.exports = {
	apps: [
		// ... existing ...
		{
			name: 'scheduler',
			script: 'npm',
			args: 'run scheduler',
			cwd: '/path/to/project',
			instances: 1,
			autorestart: true,
		},
	],
};
```
