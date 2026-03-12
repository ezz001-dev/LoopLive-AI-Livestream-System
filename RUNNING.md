# LoopLive AI — Panduan Menjalankan Aplikasi

---

## 📋 Prasyarat

Pastikan sudah terinstall di sistem:

| Software | Versi | Cek |
|---|---|---|
| Node.js | >= 18 | `node -v` |
| npm | >= 9 | `npm -v` |
| PostgreSQL | >= 14 | `psql --version` |
| Redis | >= 6 | `redis-cli ping` |
| MediaMTX | Latest | [Download](https://github.com/bluenviron/mediamtx/releases) |
| FFmpeg | Latest | `ffmpeg -version` |

---

## ⚙️ Setup Awal (Sekali Saja)

### 1. Install Dependencies
```bash
npm install
```

### 2. Konfigurasi `.env`
Buat file `.env` di root project:
```env
# Database
DATABASE_URL="postgresql://looplive_user:looplive_password@localhost:5432/looplive_db"

# JWT
JWT_SECRET="ganti-dengan-secret-yang-kuat"

# AI Provider: "openai" | "gemini"
AI_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
GEMINI_API_KEY="AIza..."

# TTS Provider: "openai" | "gemini"
TTS_PROVIDER="openai"

# Redis
REDIS_URL="redis://localhost:6379"

# YouTube Live Auto-Detect (tanpa API key)
# Isi dengan handle channel YouTube Anda
YT_CHANNEL_HANDLE="@namakanal"
```

### 3. Setup Database
```bash
# Buat database PostgreSQL
psql -U postgres -c "CREATE USER looplive_user WITH PASSWORD 'looplive_password';"
psql -U postgres -c "CREATE DATABASE looplive_db OWNER looplive_user;"

# Jalankan migrasi Prisma
npx prisma db push
```

---

## 🛠️ Development (Local)

### Jalankan Semua Service (1 Terminal)
```bash
npm run dev:all
```

Output akan berwarna dengan label per service:

```
[APP]    cyan     → Next.js dev server    (http://localhost:3000)
[SOCKET] yellow   → Socket.io server      (port 3001)
[AI]     magenta  → AI Worker
[TTS]    blue     → TTS Worker
[YT]     red      → YouTube Chat Poller
```

> Tekan **Ctrl+C** untuk stop semua service sekaligus.

### Jalankan Service Terpisah (Opsional)
```bash
npm run dev          # Next.js saja
npm run socket       # Socket.io saja
npm run ai-worker    # AI Worker saja
npm run tts-worker   # TTS Worker saja
npm run yt-poller    # YouTube Poller saja
```

### Akses Admin Panel
```
http://localhost:3000/admin
```

---

## 🚀 Deployment VPS (Production)

### 1. Install PM2 (Sekali Saja)
```bash
npm install -g pm2
```

### 2. Clone & Setup di VPS
```bash
git clone https://github.com/username/looplive.git
cd looplive
npm install
```

### 3. Konfigurasi `.env` di VPS
Sesuaikan dengan environment production (IP, password, API key production, dll).

### 4. Build Next.js
```bash
npm run build
```

### 5. Setup Database
```bash
npx prisma db push
```

### 6. Jalankan Semua Service (1 Perintah)
```bash
npm run pm2:start
```

---

## 🎛️ Perintah PM2

```bash
npm run pm2:start    # Jalankan semua service
npm run pm2:stop     # Stop semua service
npm run pm2:restart  # Restart semua service
npm run pm2:reload   # Reload tanpa downtime (untuk update)
npm run pm2:logs     # Lihat log semua service
npm run pm2:monit    # Monitor CPU & RAM real-time
```

### Status Service
```bash
pm2 status
```
```
┌─────────────────────────┬───┬─────────┬─────┬─────────┐
│ Name                    │ # │ Status  │ CPU │ Memory  │
├─────────────────────────┼───┼─────────┼─────┼─────────┤
│ looplive-app            │ 0 │ online  │ 2%  │ 120 MB  │
│ looplive-socket         │ 1 │ online  │ 0%  │  45 MB  │
│ looplive-ai-worker      │ 2 │ online  │ 0%  │  60 MB  │
│ looplive-tts-worker     │ 3 │ online  │ 0%  │  55 MB  │
│ looplive-yt-poller      │ 4 │ online  │ 0%  │  50 MB  │
└─────────────────────────┴───┴─────────┴─────┴─────────┘
```

### Auto-Start Saat Server Reboot
```bash
npm run pm2:save     # Simpan state PM2 saat ini
npm run pm2:startup  # Generate startup script — ikuti instruksi yang muncul
```

---

## 🔄 Update Aplikasi di VPS

```bash
git pull
npm install
npm run build
npm run pm2:reload   # Zero-downtime reload
```

---

## 🌐 Nginx Reverse Proxy (Recommended)

```nginx
# /etc/nginx/sites-available/looplive
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.io WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/looplive /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 📁 Log Files (Production)

Log per service tersimpan di folder `logs/`:

| File | Service |
|---|---|
| `logs/app-out.log` | Next.js App |
| `logs/socket-out.log` | Socket.io |
| `logs/ai-worker-out.log` | AI Worker |
| `logs/tts-worker-out.log` | TTS Worker |
| `logs/yt-poller-out.log` | YouTube Poller |

```bash
# Lihat log service tertentu
pm2 logs looplive-ai-worker --lines 50
```

---

## ❓ Troubleshooting

| Masalah | Solusi |
|---|---|
| Port 3000 sudah dipakai | `kill -9 $(lsof -ti:3000)` |
| Redis tidak bisa connect | `systemctl start redis` |
| PostgreSQL error | `systemctl start postgresql` |
| AI tidak merespons | Cek `pm2 logs looplive-ai-worker` |
| YouTube chat tidak terbaca | Cek `YT_CHANNEL_HANDLE` di `.env`, pastikan channel sedang live |
| Build gagal | `rm -rf .next && npm run build` |
