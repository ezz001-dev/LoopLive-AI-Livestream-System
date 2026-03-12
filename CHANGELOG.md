# Changelog — LoopLive AI Livestream System

Semua perubahan signifikan pada proyek ini akan dicatat dalam dokumen ini.
Format mengacu pada [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.4.1] - 2026-03-12

### Ditambahkan

#### YouTube Chat Polling Fix

- **`src/lib/youtube-chat-poller.ts`** — Perbaikan signifikan untuk membaca komentar YouTube Live:
  - Chat berhasil tercapture tanpa perlu cookie (cukup gunakan video ID yang valid)
  - Log yang lebih detail untuk debugging
  - Handling error yang lebih baik dengan retry mechanism

#### Edit Live Session Feature

- **`src/components/admin/EditSessionModal.tsx`** — Modal baru untuk edit konfigurasi session:
  - Update YouTube Video ID
  - Update RTMP URL dan Stream Key
  - Update AI Context dan Tone
- **`src/app/api/live/[id]/route.ts`** — Endpoint PATCH baru untuk update session:
  - Endpoint: `PATCH /api/live/[id]`
  - Field yang bisa diupdate: title, youtube_video_id, youtube_channel_id, target_rtmp_url, stream_key, context_text, ai_tone
- **`src/components/admin/ClientSessionPage.tsx`** — Client component baru untuk halaman session detail dengan fitur edit

#### Multi-Provider AI Support

- **`src/lib/ai-worker.ts`** — Dukungan multi-provider AI:
  - **OpenAI** — `AI_PROVIDER=openai`
  - **Google Gemini** — `AI_PROVIDER=gemini`
  - **SumoPod** — `AI_PROVIDER=sumopod`
- Variabel environment baru:
  - `AI_MODEL` — Pilih model (gpt-4o-mini, gemini/gemini-2.5-flash, claude-haiku-4-5, deepseek-r1, dll)
  - `SUMOPOD_API_URL` — Default: `https://ai.sumopod.com`
  - `SUMOPOD_API_KEY` — API key dari SumoPod

#### TTS Updates

- **`src/lib/tts-worker.ts`** — Pembaruan TTS:
  - Default provider diganti ke Gemini (`TTS_PROVIDER=gemini`)
  - Default model: `gemini-2.0-flash`
  - Variabel `TTS_MODEL` untuk pilih model TTS lain

### Diubah

- **AI Model** — Dari `gemini-1.5-flash-8b` ke `gemini-1.5-flash-8b` (default), bisa diganti via `AI_MODEL`
- **Admin Page Structure** — Pemisahan Server Component dan Client Component untuk mendukung fitur edit

### Model yang Tersedia

#### OpenAI

- gpt-4o, gpt-4o-mini, gpt-5, gpt-5-mini, dll

#### Google Gemini

- gemini/gemini-2.0-flash
- gemini/gemini-2.5-flash
- gemini/gemini-2.5-flash-lite
- gemini/gemini-2.5-pro
- gemini/gemini-3-flash-preview

#### Anthropic (Claude)

- claude-haiku-4-5
- claude-opus-4-6
- claude-sonnet-4-6

#### DeepSeek

- deepseek-r1
- deepseek-v3-2

#### BytePlus

- glm-4-7
- kimi-k2
- seed-2-0-mini

---

## [1.4.0] - 2026-03-12

### Ditambahkan

#### YouTube Video ID Auto-Detection

- **`src/lib/youtube-detect.ts`** — Utilitas baru untuk mendeteksi ID Video Live YouTube secara otomatis hanya berdasarkan Handle Kanal (misal: `@YouTubeHandle`).
- **Integrasi Auto-Detect** pada endpoint `/api/live/[id]/start` — jika ID video tidak diisi manual, sistem akan mendeteksi video live yang sedang aktif secara otomatis.
- **Pengaturan Kanal** di Dashboard Admin (Tab Stream Settings) — mempermudah konfigurasi kanal untuk monitoring live.

#### Infrastructure & Process Management

- **`ecosystem.config.js`** — Konfigurasi PM2 untuk mengelola 5 layanan LoopLive (Next.js, Socket, AI Worker, TTS Worker, YT Poller) dalam satu manager.
- **`dev:all` script** — Menjalankan seluruh environment development (5 terminal sekaligus) hanya dengan `npm run dev:all`.

### Diubah

- **Prisma Downgrade (v7 → v6)** — Downgrade ke versi stabil v6 untuk mengatasi bug "Engine Type Validation" dan ketidakstabilan file `prisma.config.ts` di lingkungan Windows/Docker.
- **Port Mapping PostgreSQL (5432 → 5433)** — Perubahan port default host ke 5433 untuk menghindari konflik dengan aplikasi database lain di komputer pengguna.
- **`src/lib/prisma.ts`** — Pembersihan driver adapter lama (`@prisma/adapter-pg`) yang menyebabkan overhead dan error autentikasi.

### Diperbaiki

- **P1000 Authentication Error** — Resolusi permanen masalah autentikasi Prisma ke Docker dengan mengubah `pg_hba.conf` ke metode `md5` yang lebih kompatibel.
- **Hydration Mismatch UI** — Penambahan `suppressHydrationWarning` pada layout utama untuk menghilangkan peringatan konsol yang disebabkan oleh browser extension.

---

## [1.3.0] - 2026-03-11

### Ditambahkan

#### YouTube Live Chat Integration

- **`youtube-chat-poller.ts`** — Worker baru untuk membaca komentar YouTube Live secara real-time menggunakan library `masterchat` (tanpa API key, tanpa quota limit).
- **Field `youtube_video_id`** pada model `live_sessions` di database — menyimpan Video ID dari URL YouTube Live.
- **Field `youtube_channel_id`** opsional pada `live_sessions` untuk keperluan identifikasi kanal.
- **Input YouTube Video ID** di `CreateSessionModal.tsx` — pengguna cukup copy-paste ID dari URL live YouTube.
- **Start API (`/api/live/[id]/start`)** — otomatis mempublikasikan perintah `START_POLL` ke Redis saat sesi di-GO LIVE (jika `youtube_video_id` diset).
- **Stop API (`/api/live/[id]/stop`)** — otomatis mempublikasikan perintah `STOP_POLL` ke Redis saat sesi dihentikan.
- **Script `npm run yt-poller`** — menjalankan worker YouTube Chat Poller secara standalone.
- Komentar YouTube otomatis disimpan ke `chat_logs` dan diteruskan ke AI Worker via Redis.

#### Google Gemini AI & TTS Provider

- Integrasi **Google Gemini** (`gemini-1.5-flash`) sebagai alternatif AI provider di `ai-worker.ts`.
- Integrasi **Gemini TTS** sebagai alternatif TTS provider di `tts-worker.ts`.
- Variabel environment baru: `GEMINI_API_KEY`, `AI_PROVIDER`, `TTS_PROVIDER`.
- Pemilihan provider berbasis environment variable — tidak perlu ubah kode.

#### Admin Dashboard Fitur Baru

- **`CreateSessionModal.tsx`** — modal interaktif untuk membuat live session baru, termasuk:
  - Pilihan video dari library yang sudah diupload.
  - Pemilihan AI Tone (5 opsi: Friendly, Energetic, Professional, Funny, Chill).
  - Field YouTube Video ID (opsional) dengan petunjuk langsung di modal.
  - Field konteks stream (opsional).
- **`LiveSessionsHeader.tsx`** — komponen header Live Sessions yang mengelola state modal.
- **Settings Page** — dikonversi menjadi client component dengan navigasi tab:
  - Tab **API Keys** — konfigurasi OpenAI & Gemini API key.
  - Tab **AI Providers** — pemilihan provider AI dan TTS.
  - Tab **Stream Settings** — konfigurasi RTMP, HLS, dan resolusi stream.
  - Tab **AI Defaults** — konfigurasi tone default dan panjang respons AI.

### Diubah

- `ai-worker.ts` — direfaktor untuk mendukung multi-provider (OpenAI dan Gemini).
- `tts-worker.ts` — diperbarui untuk mendukung multi-provider TTS.
- `src/app/api/live/route.ts` — endpoint POST kini juga menerima dan menyimpan `youtube_video_id`.
- `src/app/api/videos/route.ts` — penambahan handler GET untuk mengambil daftar video.
- `prisma/schema.prisma` — model `live_sessions` diperluas dengan field `youtube_video_id` dan `youtube_channel_id`.

### Dependensi Baru

- `masterchat@^1.1.0` — library untuk membaca YouTube Live Chat tanpa API key.
- `@google/generative-ai@^0.24.1` — SDK Google Gemini AI.

---

## [1.0.0] - 2026-03-11

### Ditambahkan

#### Fase 1: Infrastructure & Core Setup

- Konfigurasi Docker Compose untuk PostgreSQL, Redis, dan MediaMTX.
- Inisialisasi Prisma ORM dengan skema database inti:
  - `admin_users`, `live_sessions`, `chat_logs`, `ai_reply_logs`, `videos`.

#### Fase 2: Backend API Gateway

- Implementasi REST API menggunakan Next.js App Router:
  - **Auth** — `POST /api/auth/login`, middleware JWT.
  - **Video Management** — `POST /api/videos` (upload), `GET /api/videos`.
  - **Live Control** — `POST /api/live`, `POST /api/live/[id]/start`, `POST /api/live/[id]/stop`, `GET /api/live/[id]`.

#### Fase 3: Loop Worker Service (FFmpeg Manager)

- Implementasi `WorkerManager` untuk mengelola proses FFmpeg (looping video ke RTMP endpoint).
- Solusi inisialisasi Prisma yang _build-safe_ menggunakan Recursive Proxy untuk menghindari error di Next.js build time.

#### Fase 4: Chat & WebSocket Server

- Server standalone Socket.io terintegrasi dengan Redis Pub/Sub.
- Pendataan chat secara real-time ke database.
- Broadcast event `chat_broadcast` ke semua viewer.

#### Fase 5: AI Worker (LLM)

- Integrasi OpenAI GPT-4o-mini untuk menghasilkan balasan chat otomatis berbasis konteks.
- Mekanisme queue chat menggunakan Redis (`chat_event_queue`).
- System prompt adaptif berdasarkan AI tone dan konteks sesi.

#### Fase 6: TTS Core Service

- Integrasi OpenAI TTS (`tts-1`) untuk mengubah balasan AI menjadi suara (MP3).
- Sinkronisasi event `ai_audio_ready` ke frontend via Redis → Socket.

#### Fase 7: Frontend Development

- **Dashboard Admin Premium** — Stats, Video Library, Session Control.
- **Viewer Interface Publik** — HLS Video Player, Chat real-time, AI Audio Auto-Injector.

#### Dokumentasi & Panduan

- Panduan menjalankan dengan Docker (`RUN_WITH_DOCKER.md`).
- Panduan instalasi manual/native (`RUN_WITHOUT_DOCKER.md`).
- Panduan koneksi database Docker (`DOCKER_DB_GUIDE.md`).

### Diperbaiki

- Perbaikan error `PrismaClientInitializationError` "Unsafe build-time initialization" pada Next.js 15.
- Resolusi konflik port 5432 antara Docker dan PostgreSQL native Windows.
- Perbaikan issue `datasourceUrl` / `datasources` pada Prisma 7.x yang tidak lagi mendukung konstruktor dengan properti tersebut.
- Perbaikan duplikasi import dan linting issues pada komponen frontend.

### Keamanan

- Implementasi JWT-based authentication.
- Semua API key dikelola melalui `.env` (tidak pernah di-commit ke repository).
