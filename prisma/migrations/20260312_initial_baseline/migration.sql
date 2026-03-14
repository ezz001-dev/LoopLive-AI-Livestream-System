CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_sessions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "context_text" TEXT,
    "ai_tone" TEXT NOT NULL DEFAULT 'friendly',
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "viewer_count" INTEGER NOT NULL DEFAULT 0,
    "youtube_video_id" TEXT,
    "youtube_channel_id" TEXT,
    "target_rtmp_url" TEXT,
    "stream_key" TEXT,
    "schedule_enabled" BOOLEAN NOT NULL DEFAULT false,
    "schedule_type" TEXT NOT NULL DEFAULT 'one-time',
    "schedule_start_at" TIMESTAMP(3),
    "schedule_end_at" TIMESTAMP(3),
    "schedule_days" TEXT,
    "schedule_start_time" TEXT,
    "schedule_end_time" TEXT,
    "schedule_timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "schedule_repeat_end" TIMESTAMP(3),
    "last_scheduled_run" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "context_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "context_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_logs" (
    "id" TEXT NOT NULL,
    "live_session_id" TEXT NOT NULL,
    "viewer_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_reply_logs" (
    "id" TEXT NOT NULL,
    "live_session_id" TEXT NOT NULL,
    "chat_id" TEXT,
    "prompt" TEXT NOT NULL,
    "reply" TEXT NOT NULL,
    "audio_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_reply_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "session_schedules" (
    "id" TEXT NOT NULL,
    "live_session_id" TEXT NOT NULL,
    "schedule_type" TEXT NOT NULL DEFAULT 'one-time',
    "scheduled_at" TIMESTAMP(3),
    "scheduled_end_at" TIMESTAMP(3),
    "days_of_week" TEXT,
    "start_time" TEXT,
    "end_time" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "repeat_end_date" TIMESTAMP(3),
    "last_run" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL DEFAULT '1',
    "openai_api_key" TEXT,
    "gemini_api_key" TEXT,
    "ai_provider" TEXT NOT NULL DEFAULT 'openai',
    "tts_provider" TEXT NOT NULL DEFAULT 'openai',
    "yt_channel_handle" TEXT,
    "tiktok_channel_handle" TEXT,
    "ai_name" TEXT NOT NULL DEFAULT 'Loop',
    "ai_persona" TEXT,
    "ai_tone_default" TEXT NOT NULL DEFAULT 'friendly',
    "mediamtx_host" TEXT NOT NULL DEFAULT 'localhost',
    "rtmp_port" INTEGER NOT NULL DEFAULT 1935,
    "hls_port" INTEGER NOT NULL DEFAULT 8888,
    "redis_url" TEXT NOT NULL DEFAULT 'redis://localhost:6379',
    "max_response_length" INTEGER NOT NULL DEFAULT 150,
    "yt_cookie" TEXT,
    "app_base_url" TEXT NOT NULL DEFAULT 'http://localhost:3000',
    "scheduler_api_key" TEXT NOT NULL DEFAULT 'looplive-scheduler-internal-key',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sound_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "keyword" TEXT,
    "audio_url" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sound_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

ALTER TABLE "live_sessions"
ADD CONSTRAINT "live_sessions_video_id_fkey"
FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "chat_logs"
ADD CONSTRAINT "chat_logs_live_session_id_fkey"
FOREIGN KEY ("live_session_id") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_reply_logs"
ADD CONSTRAINT "ai_reply_logs_live_session_id_fkey"
FOREIGN KEY ("live_session_id") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "session_schedules"
ADD CONSTRAINT "session_schedules_live_session_id_fkey"
FOREIGN KEY ("live_session_id") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
