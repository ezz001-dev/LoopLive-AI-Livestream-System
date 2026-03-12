# Panduan Menjalankan dengan Docker

Metode ini adalah cara tercepat dan paling stabil karena seluruh dependensi (Postgres, Redis, MediaMTX) sudah terkonfigurasi di dalam kontainer.

## Prasyarat
- **Docker Desktop** terinstal dan berjalan.
- **Node.js** & **npm** terinstal di host.
- **FFmpeg** terinstal di PATH sistem host (untuk worker FFmpeg).
- File `.env` sudah dikonfigurasi (Database URL, OpenAI Key, dll).

---

## Langkah 1: Jalankan Infrastruktur
Buka terminal dan jalankan:
```bash
docker-compose up -d
```

## Langkah 2: Persiapan Database
Pastikan konfigurasi `.env` Anda sudah benar. Lihat [Panduan Koneksi Database](DOCKER_DB_GUIDE.md) untuk detailnya.
Sinkronkan skema database ke PostgreSQL di dalam Docker:
```bash
npx prisma db push
```

## Langkah 3: Jalankan Backend Workers
Buka **3 terminal terpisah** dan jalankan perintah berikut:
1. `npm run socket`
2. `npm run ai-worker`
3. `npm run tts-worker`

## Langkah 4: Jalankan Frontend
Buka terminal ke-4 dan jalankan:
```bash
npm run dev
```
Akses di: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## Skenario Pengujian
1. Upload video di menu **Videos**.
2. Buat sesi baru di menu **Live Sessions**.
3. Klik **Start Livestream** di detail sesi.
4. Buka **Public View** dan coba kirim chat. AI akan membalas dengan teks dan suara secara otomatis.
