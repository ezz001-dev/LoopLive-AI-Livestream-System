ALTER TABLE "videos"
ADD COLUMN "file_size" BIGINT,
ADD COLUMN "storage_provider" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN "storage_key" TEXT,
ADD COLUMN "public_url" TEXT;
