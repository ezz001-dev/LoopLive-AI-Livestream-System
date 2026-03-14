ALTER TABLE "live_sessions"
ADD COLUMN "loop_mode" TEXT NOT NULL DEFAULT 'infinite',
ADD COLUMN "loop_count" INTEGER;
