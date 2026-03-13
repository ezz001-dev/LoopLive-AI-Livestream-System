# Dokumen Alur Kerja LoopLive AI

Dokumen ini menjelaskan secara detail bagaimana sistem LoopLive AI bekerja, mulai dari proses streaming video hingga interaksi AI secara real-time.

---

## 1. Arsitektur Utama
Sistem ini menggunakan arsitektur berbasis **Micro-services/Workers** yang dihubungkan melalui **Redis Pub/Sub** untuk memastikan performa tinggi dan responsivitas real-time.

- **Frontend & API**: Next.js (Admin Panel & Viewer Page).
- **Database**: Prisma ORM dengan PostgreSQL/SQLite untuk menyimpan sesi, chat, dan pengaturan.
- **Message Broker**: Redis (ioredis) untuk komunikasi antar worker.
- **Media Server**: MediaMTX sebagai server RTMP/HLS internal.
- **Engine Video**: FFmpeg untuk pengolahan video loop.

---

## 2. Alur Live Streaming (Video Loop)
Alur ini bertanggung jawab untuk mengirimkan konten video ke platform tujuan (YouTube/TikTok/MediaMTX).

1. **Inisiasi**: User menekan tombol "Start" di Admin Panel.
2. **API Call**: Next.js API `/api/live/[id]/start` dipanggil.
3. **Worker Manager**:
   - Sistem mengambil lokasi file video di `public/videos/`.
   - Menentukan tujuan RTMP (baik server eksternal seperti YouTube atau server internal MediaMTX).
4. **FFmpeg Process**:
   - `ffmpeg` dijalankan secara terpisah (spawned process).
   - Video diputar secara berulang (`-stream_loop -1`) dalam format FLV.
5. **Output**: Stream dikirimkan ke target URL dan status di database berubah menjadi `LIVE`.

---

## 3. Alur Interaksi AI & Chat (The Brain)
Ini adalah alur paling kompleks yang melibatkan pengolahan pesan penonton menjadi respon suara AI.

### A. Pengumpulan Chat (Chat Polling)
- **YouTube**: Worker `youtube-chat-poller.ts` memantau live chat menggunakan `YT_COOKIE` dan `Video ID`.
- **Direct Chat**: Pesan dari halaman Viewer dikirim via Socket.IO.
- **Queueing**: Setiap pesan baru dibungkus ke dalam JSON dan dipublikasikan ke channel Redis `chat_event_queue`.

### B. Pemrosesan Respon AI (AI Worker)
- **Watcher**: `ai-worker.ts` mendengarkan channel `chat_event_queue`.
- **Konteks**: Worker mengambil histori 10 chat terakhir dan identitas AI (Persona) dari database.
- **LLM**: Mengirimkan data ke OpenAI atau Google Gemini sesuai pengaturan.
- **Hasil**: Respon teks AI disimpan di database dan dipublikasikan ke Redis:
  - Channel `chat_broadcast`: Untuk menampilkan teks di UI.
  - Channel `ai_voice_play`: Untuk memicu pembuatan suara.

### C. Pembuatan Suara (TTS Worker)
- **Watcher**: `tts-worker.ts` mendengarkan channel `ai_voice_play`.
- **Generasi**: Mengonversi teks AI menjadi file suara (`.mp3`) menggunakan OpenAI TTS, Gemini TTS, atau Edge TTS.
- **Storage**: File disimpan di `public/audio/`.
- **Ready**: Mengirim sinyal `ai_audio_ready` ke Redis beserta URL filenya.

### D. Distribusi ke Viewer (Socket Server)
- **Socket Server**: Mendengarkan semua sinyal Redis.
- **Broadcast**: Mengirimkan event `chat_broadcast` (teks) dan `ai_voice_play` (audio URL) ke browser Viewers yang terkoneksi di room yang sama.

---

## 4. Alur Penjadwalan (Scheduler)
Memungkinkan streaming berjalan otomatis pada jam-jam tertentu.

1. **Background Loop**: `scheduler-worker.ts` berjalan setiap 30 detik.
2. **Check**: Memeriksa tabel `session_schedules` untuk melihat apakah ada jadwal yang cocok dengan waktu server saat ini.
3. **Action**: 
   - Jika jadwal masuk: Memanggil API Internal `/start` menggunakan `SCHEDULER_API_KEY`.
   - Jika jadwal berakhir: Memanggil API Internal `/stop`.
4. **Dynamic Config**: Scheduler selalu mengambil `APP_BASE_URL` terbaru dari database sebelum memproses.

---

## 5. Alur Suara Sapaan (Greeting Sounds)
Fitur otomatis untuk meningkatkan interaksi penonton.

1. **Trigger Join**: Saat socket mendeteksi `join_room`, server memeriksa tabel `sound_events` tipe `join`.
2. **Trigger Keyword**: Saat chat masuk, server memindai teks untuk mencari kata kunci (misal: "hai").
3. **Execution**: Jika cocok, Socket Server memerintahkan browser untuk langsung memutar file audio yang sesuai tanpa melalui proses AI.

---

## 6. Manajemen Pengaturan (Dynamic Configuration)
Hampir seluruh sistem bergantung pada tabel `system_settings`:

- **UI**: Admin mengubah API Key, provider AI, atau port di halaman Settings.
- **Persistence**: Data disimpan di DB via API `/api/settings`.
- **Real-time**: Worker secara berkala (atau saat menerima trigger baru) akan mengambil data terbaru dari database (`findUnique`), sehingga perubahan `.env` tidak lagi memerlukan restart aplikasi manual.
