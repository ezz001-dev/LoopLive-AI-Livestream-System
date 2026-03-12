# Panduan Menjalankan Tanpa Docker (Native)

Gunakan panduan ini jika Anda ingin menginstal dan menjalankan semua layanan secara langsung di Windows.

## Prasyarat Manual
Anda harus menginstal dan menjalankan layanan berikut sebelum memulai aplikasi:

### 1. PostgreSQL (Port 5432)
- Instal PostgreSQL (v14+).
- Buat database: `looplive_db`.
- Update `.env`: `DATABASE_URL="postgresql://user:pass@localhost:5432/looplive_db"`.

### 2. Redis (Port 6379)
- Instal Redis for Windows (misal via [tporadowski/redis](https://github.com/tporadowski/redis/releases)).
- Jalankan `redis-server.exe`.

### 3. MediaMTX (Streaming Server)
- Unduh binary Windows dari [GitHub MediaMTX](https://github.com/bluenviron/mediamtx/releases).
- Jalankan `mediamtx.exe`.

---

## Langkah 1: Persiapan Aplikasi
Setelah layanan di atas aktif, buka terminal:
```bash
npm install
npx prisma db push
```

## Langkah 2: Jalankan Workers
Buka **3 terminal terpisah**:
1. `npm run socket`
2. `npm run ai-worker`
3. `npm run tts-worker`

## Langkah 3: Jalankan Frontend
Buka terminal ke-4:
```bash
npm run dev
```
Akses di: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## Tips
- Pastikan FFmpeg bisa diakses dari terminal dengan menjalankan perintah `ffmpeg -version`.
- Jika port bentrok, Anda bisa mengubah konfigurasi di file `mediamtx.yml` dan `.env`.
