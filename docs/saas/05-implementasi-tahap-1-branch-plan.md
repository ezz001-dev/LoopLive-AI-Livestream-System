# Implementasi Tahap 1 Branch Plan

## Tujuan

Dokumen ini memecah implementasi SaaS tahap 1 menjadi rencana kerja yang bisa langsung dipakai di branch khusus, dengan fokus pada fondasi multi-tenant terlebih dahulu.

Tahap 1 belum mencakup billing penuh atau internal ops console yang lengkap. Fokusnya adalah:

- menambahkan konsep tenant ke data utama
- memisahkan identity user tenant dari admin internal existing
- menyiapkan migrasi data lama ke tenant default
- menjaga app lama tetap bisa berjalan selama masa transisi

## Nama Branch yang Disarankan

Gunakan branch khusus:

```bash
feat/saas-foundation
```

Alternatif:

- `feat/multi-tenant-foundation`
- `feat/saas-phase-1`

## Scope Tahap 1

Yang masuk tahap 1:

1. model `tenants`
2. model `users`
3. model `tenant_users`
4. penambahan `tenant_id` ke:
   - `videos`
   - `live_sessions`
   - `sound_events`
5. tenant default untuk semua data lama
6. backfill data existing ke tenant default
7. adapter auth awal dari `admin_users` ke model baru

Yang belum masuk tahap 1:

- billing live
- Stripe/Xendit/Midtrans integration
- internal ops console penuh
- support impersonation
- pemecahan penuh `system_settings` menjadi `tenant_settings` dan `tenant_secrets`
- worker tenant-aware penuh di seluruh proses background

## Prinsip Eksekusi

1. Jangan putuskan flow existing sekaligus.
2. Tambahkan compatibility layer selama transisi.
3. Mulai dari database, lalu auth, lalu query scoping.
4. Jangan sentuh billing sebelum tenant scope selesai.

## Kondisi Codebase Saat Ini

Beberapa titik yang paling penting untuk tahap 1:

- auth masih memakai `admin_users` di [src/app/api/auth/login/route.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/api/auth/login/route.ts)
- data inti masih global:
  - `videos`
  - `live_sessions`
  - `sound_events`
- settings masih global di:
  - `system_settings`
- worker dan scheduler masih membaca data tanpa `tenant_id`

## Strategi Commit yang Disarankan

### Commit 1: Schema Foundation

Isi:

- tambahkan model:
  - `tenants`
  - `users`
  - `tenant_users`
- tambahkan `tenant_id` ke:
  - `videos`
  - `live_sessions`
  - `sound_events`
- tambahkan index tenant yang dibutuhkan

Target file:

- [prisma/schema.prisma](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/prisma/schema.prisma)
- migration baru di `prisma/migrations/...`

Catatan:

- `tenant_id` sebaiknya nullable sementara selama fase migrasi, lalu dibuat required setelah backfill

### Commit 2: Backfill Strategy

Isi:

- script untuk membuat tenant default
- script untuk mengisi `tenant_id` pada data lama

Target file:

- `scripts/...` baru untuk backfill tenant default
- dokumentasi langkah migrasi data

Catatan:

- gunakan tenant default seperti:
  - name: `Default Workspace`
  - slug: `default-workspace`

### Commit 3: Auth Bridge

Isi:

- siapkan model `users`
- adaptasi login agar bisa membaca user tenant baru
- pertahankan compatibility dengan `admin_users` sementara

Target file:

- [src/app/api/auth/login/route.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/api/auth/login/route.ts)
- [src/proxy.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/proxy.ts)
- util auth baru bila diperlukan

Catatan:

- jangan hapus `admin_users` dulu
- tahap ini tujuannya membuat transisi mungkin dilakukan bertahap

### Commit 4: Tenant Context Read Path

Isi:

- mulai baca tenant context pada route dashboard utama
- scoping query `videos`, `live_sessions`, `sound_events`

Target file awal:

- [src/app/admin/videos/page.tsx](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/admin/videos/page.tsx)
- [src/app/admin/live/page.tsx](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/admin/live/page.tsx)
- [src/app/api/videos/route.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/api/videos/route.ts)
- [src/app/api/live/route.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/api/live/route.ts)
- [src/app/api/sounds/route.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/api/sounds/route.ts)

Catatan:

- tenant scoping awal bisa memakai tenant default hardcoded untuk menjaga flow berjalan
- tujuan tahap ini adalah memaksa semua query baru sadar tenant

### Commit 5: Session Ownership Flow

Isi:

- pastikan create session, upload video, dan sound event baru selalu membawa `tenant_id`

Target file:

- [src/app/api/videos/upload/complete/route.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/api/videos/upload/complete/route.ts)
- [src/app/api/live/route.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/api/live/route.ts)
- [src/app/api/sounds/route.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/api/sounds/route.ts)

## File Impact Tahap 1

### Database

- [prisma/schema.prisma](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/prisma/schema.prisma)
- `prisma/migrations/...`
- `scripts/...` backfill

### Auth

- [src/app/api/auth/login/route.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/api/auth/login/route.ts)
- [src/proxy.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/proxy.ts)

### Tenant-facing Data Paths

- [src/app/api/videos/route.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/api/videos/route.ts)
- [src/app/api/live/route.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/api/live/route.ts)
- [src/app/api/sounds/route.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/api/sounds/route.ts)
- [src/app/admin/videos/page.tsx](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/admin/videos/page.tsx)
- [src/app/admin/live/page.tsx](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/app/admin/live/page.tsx)

### Background Processes yang Perlu Diinventaris Dulu

- [src/lib/scheduler-worker.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/lib/scheduler-worker.ts)
- [src/lib/ai-worker.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/lib/ai-worker.ts)
- [src/lib/tts-worker.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/lib/tts-worker.ts)
- [src/lib/socket-server.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/lib/socket-server.ts)
- [src/lib/youtube-chat-poller.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/lib/youtube-chat-poller.ts)

Catatan:

- pada tahap 1, worker belum harus full tenant-aware
- tetapi kita harus tahu semua titik yang nanti akan ikut berubah

## Strategi Migrasi Data

### Tahap Aman

1. Tambahkan model tenant baru.
2. Tambahkan `tenant_id` nullable ke tabel utama.
3. Buat tenant default.
4. Backfill semua row lama ke tenant default.
5. Setelah semua data terisi, ubah `tenant_id` menjadi required.

### Data yang Harus Dibackfill

- semua `videos`
- semua `live_sessions`
- semua `sound_events`

Catatan:

- `chat_logs` dan `ai_reply_logs` cukup mengikuti tenant melalui relasi `live_sessions` pada tahap awal

## Compatibility Strategy

Selama transisi, app lama masih mungkin perlu berjalan.

Pendekatan yang aman:

- pertahankan `admin_users` sementara
- pertahankan `system_settings` sementara
- tenant default menjadi jembatan untuk semua flow existing

Jangan lakukan pada tahap 1:

- hapus `admin_users`
- hapus `system_settings`
- mewajibkan worker tenant-aware penuh sekaligus

## Definition of Done Tahap 1

Tahap 1 dianggap selesai jika:

- model `tenants`, `users`, dan `tenant_users` sudah ada
- `videos`, `live_sessions`, dan `sound_events` punya `tenant_id`
- semua data lama sudah terhubung ke tenant default
- flow create video dan create session baru sudah menyimpan `tenant_id`
- query dashboard utama sudah tenant-aware
- auth bridge awal ke model `users` sudah tersedia
- app existing tetap bisa dipakai selama masa transisi

## Risiko Terbesar

- auth migration terlalu cepat dan memutus akses existing
- background worker membaca data tanpa tenant scope
- backfill tidak konsisten sehingga sebagian row punya `tenant_id`, sebagian tidak
- route dashboard tenant dan route internal ops belum dipisah dari awal

## Langkah Setelah Tahap 1

Setelah tahap 1 stabil, fase berikutnya yang paling masuk akal:

1. pecah `system_settings` menjadi `tenant_settings`
2. pindahkan secret ke `tenant_secrets`
3. buat internal ops console minimum
4. buat worker dan scheduler menerima tenant context
5. baru masuk ke subscription dan billing
