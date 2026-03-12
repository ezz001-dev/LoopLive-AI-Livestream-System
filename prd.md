# PRD — LoopLive AI Livestream System

**Versi:** 1.3.0  
**Tanggal:** 11 Maret 2026  
**Status:** In Development  

---

## 1. Overview

**LoopLive** adalah sistem livestream automation berbasis AI yang memungkinkan siapapun menjalankan live streaming 24/7 secara otomatis. Sistem memutar video dalam loop, menerima komentar dari penonton (baik dari internal chat maupun YouTube Live), dan merespons secara real-time menggunakan AI yang dikonfigurasi dengan kepribadian dan konteks yang disesuaikan.

### Tagline
> *"Stream terus, AI yang ngobrol."*

---

## 2. Problem Statement

Livestreaming manual sangat melelahkan — streamer harus hadir terus-menerus, membaca komentar, dan merespons penonton. Ini membatasi durasi dan konsistensi stream. Banyak kreator juga ingin memanfaatkan jam tayang panjang untuk engagement tetapi tidak memiliki bandwidth untuk melakukannya secara manual.

---

## 3. Target Pengguna

| Segmen | Deskripsi |
|---|---|
| **Kreator Konten** | YouTuber, TikToker yang ingin live 24/7 tanpa harus online terus |
| **Brand/Bisnis** | Bisnis yang ingin siaran produk/promosi otomatis |
| **Developer** | Developer yang ingin self-host platform AI streaming sendiri |

---

## 4. Core Features

### 4.1 Loop Video Streaming
- Upload video MP4 ke library.
- Pilih video sebagai konten loop di setiap sesi live.
- FFmpeg menjalankan video secara infinite loop ke RTMP endpoint.
- Video dapat distream ke platform apapun yang mendukung RTMP (YouTube, TikTok, dll.).

### 4.2 AI Chat Responder
- AI membaca komentar masuk dan menghasilkan respons teks otomatis.
- Mendukung dua provider AI:
  - **OpenAI GPT-4o-mini** — akurat, mudah dikonfigurasi.
  - **Google Gemini Flash** — alternatif cepat dan hemat biaya.
- Respons dikontekstualkan berdasarkan deskripsi konten stream.
- AI Tone dapat dikonfigurasi per sesi:
  - Friendly & Welcoming
  - Energetic & Hype
  - Professional & Informative
  - Funny & Sarcastic
  - Chill & Relaxed

### 4.3 Text-to-Speech (TTS)
- Respons AI dikonversi ke audio secara otomatis.
- Mendukung dua provider TTS:
  - **OpenAI TTS** (`tts-1`) — kualitas natural, banyak pilihan suara.
  - **Google Gemini TTS** — alternatif terintegrasi.
- Audio diputar otomatis di halaman viewer (overlay, tidak mengganggu video).

### 4.4 YouTube Live Chat Integration
- Membaca komentar dari YouTube Live secara real-time menggunakan `masterchat`.
- **Tanpa API key** — tidak ada quota limit, ringan (~15MB RAM).
- Komentar YouTube masuk ke pipeline AI yang sama dengan komentar internal.
- Diaktifkan per sesi dengan mengisi **YouTube Video ID** saat membuat sesi.
- Poller otomatis start/stop sesuai status sesi (GO LIVE / STOP).

### 4.5 Admin Dashboard
- Manajemen video library (upload, list, hapus).
- Manajemen live session (buat, mulai, hentikan, monitor).
- Statistik viewer count real-time.
- Riwayat chat log dan AI reply log per sesi.
- Settings terpusat untuk API key dan konfigurasi provider.

### 4.6 Viewer Page (Publik)
- HLS video player untuk menonton stream.
- Chat real-time berbasis WebSocket.
- AI audio auto-play saat AI merespons.

---

## 5. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Admin Dashboard                   │
│          (Next.js App Router — Port 3000)           │
└───────────────────────────┬─────────────────────────┘
                            │ REST API
┌───────────────────────────▼─────────────────────────┐
│                  API Gateway (Next.js)               │
│  /api/auth  /api/videos  /api/live  /api/live/[id]  │
└──────┬──────────────┬───────────────────────────────┘
       │              │
       ▼              ▼
 ┌──────────┐   ┌──────────────────────────────────┐
 │PostgreSQL│   │           Redis Pub/Sub            │
 │(Database)│   │  chat_event_queue, ai_reply_queue │
 └──────────┘   └────┬──────────┬──────────────────┘
                     │          │
        ┌────────────▼──┐  ┌────▼──────────────┐
        │   AI Worker   │  │   TTS Worker       │
        │ (OpenAI/Gemini│  │ (OpenAI/Gemini TTS)│
        └───────────────┘  └────────────────────┘
              │
              ▼
       ┌─────────────┐       ┌──────────────────────┐
       │ Socket.io   │◄──────│ YouTube Chat Poller  │
       │ Server       │       │ (masterchat — no API)│
       └──────┬──────┘       └──────────────────────┘
              │
              ▼
       ┌─────────────┐       ┌──────────────────────┐
       │   Viewer    │       │     FFmpeg Worker     │
       │  (Browser)  │       │  (Video Loop → RTMP) │
       └─────────────┘       └──────────────────────┘
                                       │
                               ┌───────▼──────┐
                               │   MediaMTX   │
                               │ (RTMP → HLS) │
                               └──────────────┘
```

---

## 6. API Endpoints

### Authentication
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/auth/login` | Login admin, return JWT |

### Video Management
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/videos` | Ambil daftar video |
| POST | `/api/videos` | Upload video baru |
| DELETE | `/api/videos/[id]` | Hapus video |

### Live Session
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/live` | Daftar semua sesi |
| POST | `/api/live` | Buat sesi baru |
| GET | `/api/live/[id]` | Detail sesi + status |
| POST | `/api/live/[id]/start` | GO LIVE (start FFmpeg + YouTube poller) |
| POST | `/api/live/[id]/stop` | Stop stream |

---

## 7. Database Schema

```
admin_users
├── id (uuid, PK)
├── email (unique)
├── password_hash
└── created_at

live_sessions
├── id (uuid, PK)
├── title
├── video_id → videos.id
├── context_text (opsional)
├── ai_tone (default: "friendly")
├── status (IDLE / LIVE / STOPPED)
├── viewer_count
├── youtube_video_id (opsional)  ← baru v1.3
├── youtube_channel_id (opsional) ← baru v1.3
├── created_at
└── updated_at

videos
├── id (uuid, PK)
├── filename
├── file_path
├── file_size
├── file_type
└── created_at

chat_logs
├── id (uuid, PK)
├── live_session_id → live_sessions.id
├── viewer_id (nama / username)
├── message
└── created_at

ai_reply_logs
├── id (uuid, PK)
├── live_session_id → live_sessions.id
├── reply_text
├── audio_url
└── created_at
```

---

## 8. Redis Channels

| Channel | Arah | Deskripsi |
|---|---|---|
| `chat_event_queue` | Pub → AI Worker | Komentar baru masuk untuk diproses |
| `chat_broadcast` | Pub → Socket | Broadcast komentar ke viewer |
| `ai_audio_ready` | Pub → Socket | Notifikasi audio AI siap diputar |
| `youtube_poll_control` | Pub → YT Poller | Perintah START_POLL / STOP_POLL |

---

## 9. Worker Services

| Service | Script | Port/Channel | Deskripsi |
|---|---|---|---|
| **Next.js App** | `npm run dev` | :3000 | API + Frontend |
| **Socket Server** | `npm run socket` | :3001 | WebSocket real-time |
| **AI Worker** | `npm run ai-worker` | Redis sub | Generate respons AI |
| **TTS Worker** | `npm run tts-worker` | Redis sub | Convert text → audio |
| **YouTube Poller** | `npm run yt-poller` | Redis pub/sub | Baca komentar YouTube |

---

## 10. Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=...

# OpenAI
OPENAI_API_KEY=sk-...

# Google Gemini
GEMINI_API_KEY=AIza...

# Provider Selection
AI_PROVIDER=openai        # "openai" | "gemini"
TTS_PROVIDER=openai       # "openai" | "gemini"

# Redis
REDIS_URL=redis://localhost:6379
```

---

## 11. Flow: YouTube Live Chat → AI Response

```
YouTube Live
     │
     ▼ (masterchat — HTTP internal YT API)
YouTube Chat Poller
     │ via Redis: chat_event_queue
     ▼
AI Worker
     │ call OpenAI / Gemini
     ▼
TTS Worker
     │ generate audio MP3
     ▼
Socket.io → Broadcast ke semua viewer
     │
     ▼
Browser: auto-play audio
```

---

## 12. Non-Functional Requirements

| Aspek | Target |
|---|---|
| **Availability** | 99%+ — worker harus auto-restart jika crash |
| **Latency AI** | < 3 detik dari komentar masuk hingga audio diputar |
| **RAM Usage** | < 1GB (optimized untuk VPS 2vCPU/2GB RAM) |
| **Stream Stability** | FFmpeg harus loop tanpa putus selama stream aktif |
| **Security** | JWT untuk semua admin endpoint, API key di `.env` saja |

---

## 13. Deployment (Recommended)

### Minimum VPS Spec
- **CPU:** 2 vCPU
- **RAM:** 2 GB
- **Storage:** 20 GB SSD
- **OS:** Ubuntu 22.04 LTS

### Stack
```yaml
Services:
  - Next.js (API + Frontend)
  - Socket.io Server
  - AI Worker (Node.js)
  - TTS Worker (Node.js)
  - YouTube Chat Poller (Node.js)
  - PostgreSQL 15
  - Redis 7
  - MediaMTX (RTMP → HLS)
```

### Reverse Proxy (Nginx)
- Port 80/443 → Next.js (port 3000)
- Port 3001 → Socket.io (WebSocket upgrade)
- HTTPS via Certbot/Let's Encrypt

---

## 14. Roadmap

### v1.4 (Planned)
- [ ] OAuth YouTube Login — deteksi live stream aktif otomatis (tanpa copy-paste videoId).
- [ ] TikTok Live Chat Integration.
- [ ] Dashboard analytics: grafik viewer count, jumlah komentar, response rate.

### v1.5 (Planned)
- [ ] Multi-stream management — jalankan beberapa sesi live sekaligus.
- [ ] Server-side audio mixing (FFmpeg) — AI voice masuk langsung ke stream.
- [ ] Plugin system untuk kustomisasi respons AI.

### v2.0 (Future)
- [ ] SaaS-ready multi-tenant architecture.
- [ ] CDN integration untuk distribusi HLS.
- [ ] Mobile app untuk monitoring stream.