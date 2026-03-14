# LoopLive AI — VPS Deployment Guide with PM2

Panduan ini menjelaskan cara menjalankan **semua layanan dengan 1 perintah** menggunakan PM2.

---

## Prerequisites

```bash
# Install PM2 globally (sekali saja)
npm install -g pm2

# Install dependencies
npm install

# Build Next.js untuk production
npm run build
```

---

## Konfigurasi .env

Edit file `.env` sesuai environment VPS:

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/looplive_db"
JWT_SECRET="ganti-dengan-secret-yang-kuat"
OPENAI_API_KEY="sk-..."
GEMINI_API_KEY="AIza..."       # Opsional
AI_PROVIDER="openai"
TTS_PROVIDER="openai"
REDIS_URL="redis://localhost:6379"
YT_CHANNEL_HANDLE="@namakanal" # Channel YouTube Anda
```

Untuk panel admin yang diamankan dengan Cloudflare Zero Trust, lihat panduan:

- [Cloudflare Zero Trust Admin Setup](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/docs/cloudflare-zero-trust-admin.md)

---

## Menjalankan Semua Service (1 Perintah)

```bash
npm run pm2:start
```

Ini akan menjalankan **5 service sekaligus** sebagai background process:

| # | Service | Nama PM2 | Port |
|---|---|---|---|
| 1 | Next.js App + API | `looplive-app` | 3000 |
| 2 | Socket.io Chat | `looplive-socket` | 3001 |
| 3 | AI Worker | `looplive-ai-worker` | — |
| 4 | TTS Worker | `looplive-tts-worker` | — |
| 5 | YouTube Poller | `looplive-yt-poller` | — |

---

## Perintah PM2 yang Berguna

```bash
# Lihat status semua service
pm2 status

# Lihat log real-time semua service
npm run pm2:logs

# Lihat log service tertentu
pm2 logs looplive-ai-worker

# Monitor CPU & RAM
npm run pm2:monit

# Restart semua (misal setelah update .env)
npm run pm2:restart

# Reload tanpa downtime (untuk production)
npm run pm2:reload

# Stop semua
npm run pm2:stop
```

---

## Auto-Start Saat Server Reboot

Agar semua service otomatis jalan saat VPS restart:

```bash
# 1. Save state PM2 saat ini
npm run pm2:save

# 2. Generate startup script (jalankan perintah yang muncul sebagai root)
npm run pm2:startup
```

---

## Nginx Reverse Proxy (Recommended)

Install Nginx dan buat config:

```nginx
# /etc/nginx/sites-available/looplive
server {
    listen 80;
    server_name admin.fluxo-ai.pro;

    # Next.js App
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Cf-Access-Authenticated-User-Email $http_cf_access_authenticated_user_email;
    }

    # Socket.io (WebSocket)
    location /socket.io/ {
        proxy_pass http://localhost:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Cf-Access-Authenticated-User-Email $http_cf_access_authenticated_user_email;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    client_max_body_size 500M;
}
```

```bash
# Aktifkan config
ln -s /etc/nginx/sites-available/looplive /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Jika Anda memakai `Cloudflare Access`, request admin harus masuk melalui subdomain yang diproteksi, misalnya `admin.fluxo-ai.pro`, bukan lewat IP origin.

---

## Update Aplikasi

```bash
git pull
npm install
npm run build
npm run pm2:reload  # Zero-downtime reload
```

---

## Log Files

Log tersimpan di folder `logs/`:

```
logs/
├── app-out.log          # Next.js output
├── app-error.log        # Next.js errors
├── socket-out.log       # Socket.io output
├── ai-worker-out.log    # AI Worker output
├── tts-worker-out.log   # TTS Worker output
└── yt-poller-out.log    # YouTube Poller output
```
