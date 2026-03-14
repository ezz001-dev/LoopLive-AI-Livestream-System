# Desain Schema Prisma Multi-Tenant

## Tujuan

Mengubah struktur data LoopLive AI agar setiap customer memiliki isolasi data, settings, secret, dan usage sendiri.

## Masalah Pada Struktur Sekarang

Saat ini beberapa bagian masih terasa single-tenant:

- `system_settings` bersifat global
- `videos` belum terikat tenant
- `live_sessions` belum terikat tenant
- secret seperti API key, RTMP key, dan cookie masih belum tenant-scoped
- `admin_users` masih mencampur konsep admin internal dan user dashboard

## Boundary Akses yang Perlu Dibedakan

Sebelum merancang schema SaaS, perlu dibedakan dua surface:

### tenant-facing admin dashboard

Dipakai customer untuk:

- upload video
- mengatur stream destination
- membuat dan menjalankan session
- mengelola scheduler
- mengatur AI persona

Surface ini adalah bagian dari produk SaaS. Maka auth-nya harus tenant-aware dan tidak boleh dianggap sebagai panel internal-only.

### internal ops console

Dipakai tim internal untuk:

- support tenant
- suspend tenant
- reset state stream
- audit operasional
- melihat error lintas tenant

Surface ini harus dipisahkan dari dashboard tenant, baik secara route, role, maupun model akses.

## Model Baru yang Disarankan

### tenants

Mewakili customer atau workspace utama.

Field utama:

- `id`
- `name`
- `slug`
- `status`
- `created_at`
- `updated_at`

### tenant_users

Mewakili hubungan user dengan tenant.

Field utama:

- `id`
- `tenant_id`
- `user_id`
- `role`
- `created_at`

Role awal:

- `owner`
- `admin`
- `operator`

### users

Pisahkan dari `admin_users` agar menjadi identity table utama.

Field utama:

- `id`
- `email`
- `password_hash`
- `display_name`
- `status`
- `created_at`
- `updated_at`

Catatan:

- `users` adalah identity untuk dashboard tenant
- internal ops dapat memakai tabel tambahan atau flag role/platform-access terpisah

### internal_admins atau platform_admins

Model opsional untuk memisahkan user internal dari user tenant-facing.

Field utama:

- `id`
- `user_id`
- `role`
- `status`
- `created_at`

Contoh role:

- `support_admin`
- `ops_admin`
- `super_admin`

### tenant_settings

Pengganti `system_settings` global untuk kebutuhan tenant.

Field utama:

- `id`
- `tenant_id`
- `ai_provider`
- `tts_provider`
- `yt_channel_handle`
- `tiktok_channel_handle`
- `redis_namespace`
- `storage_provider`
- `r2_public_url`
- `r2_signed_reads`
- `r2_signed_read_ttl_seconds`
- `default_loop_mode`
- `updated_at`

### tenant_secrets

Tempat secret sensitif yang dienkripsi.

Field utama:

- `id`
- `tenant_id`
- `key`
- `encrypted_value`
- `created_at`
- `updated_at`

Contoh `key`:

- `openai_api_key`
- `gemini_api_key`
- `yt_cookie`
- `stream_key_default`
- `r2_access_key_id`
- `r2_secret_access_key`

Catatan:

- secret tenant jangan dicampur dengan secret platform internal
- secret internal ops console sebaiknya disimpan terpisah

### subscriptions

Untuk billing state per tenant.

Field utama:

- `id`
- `tenant_id`
- `plan_code`
- `status`
- `billing_provider`
- `billing_customer_id`
- `billing_subscription_id`
- `trial_ends_at`
- `current_period_end`

### usage_records

Untuk pencatatan pemakaian.

Field utama:

- `id`
- `tenant_id`
- `metric`
- `quantity`
- `period_start`
- `period_end`
- `metadata`

Contoh `metric`:

- `stream_minutes`
- `storage_gb`
- `ai_tokens`
- `tts_seconds`

## Model Existing yang Perlu Ditambah `tenant_id`

### videos

Tambahkan:

- `tenant_id`

Field yang perlu dipertahankan karena sudah ada di app saat ini:

- `file_size`
- `storage_provider`
- `storage_key`
- `public_url`

### live_sessions

Tambahkan:

- `tenant_id`

Field yang perlu dipertahankan karena sudah ada di app saat ini:

- `loop_mode`
- `loop_count`
- `target_rtmp_url`
- `stream_key`

### session_schedules

Opsional, bisa cukup lewat relasi `live_session`, tapi tenant-aware query tetap harus dipastikan.

### chat_logs

Sebaiknya tenant-aware secara tidak langsung lewat `live_session_id`.

### ai_reply_logs

Sebaiknya tenant-aware secara tidak langsung lewat `live_session_id`.

### sound_events

Tambahkan:

- `tenant_id`

Catatan:

- jika fitur audio interaktif diteruskan, sound event bisa menjadi fitur premium tenant-facing
- internal ops tidak seharusnya mengubah sound event tenant tanpa audit trail

### audit_logs

Sangat disarankan untuk SaaS karena ada dua surface yang berbeda.

Field utama:

- `id`
- `tenant_id`
- `actor_user_id`
- `actor_type`
- `action`
- `target_type`
- `target_id`
- `metadata`
- `created_at`

Contoh `actor_type`:

- `tenant_user`
- `internal_admin`

### support_sessions atau tenant_access_grants

Opsional, tetapi berguna untuk internal ops console.

Tujuan:

- mencatat kapan tim internal melihat tenant tertentu
- mendukung support impersonation yang terlacak

## Arah Relasi yang Disarankan

- `tenant -> videos`
- `tenant -> live_sessions`
- `tenant -> sound_events`
- `tenant -> tenant_settings`
- `tenant -> tenant_secrets`
- `tenant -> subscriptions`
- `tenant -> usage_records`
- `user -> tenant_users -> tenant`
- `platform_admin -> internal ops console`
- `tenant -> audit_logs`

## Contoh Struktur Prisma Tingkat Tinggi

```prisma
model tenants {
  id         String   @id @default(uuid())
  name       String
  slug       String   @unique
  status     String   @default("active")
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  users         tenant_users[]
  videos        videos[]
  live_sessions live_sessions[]
  settings      tenant_settings?
  secrets       tenant_secrets[]
  subscriptions subscriptions[]
  usage_records usage_records[]
}
```

## Migrasi Bertahap yang Aman

1. Buat model `tenants` dan `tenant_users`.
2. Buat satu tenant default untuk semua data lama.
3. Tambahkan `tenant_id` ke tabel utama.
4. Backfill semua row lama ke tenant default.
5. Update seluruh query agar wajib memakai tenant scope.
6. Pecah `system_settings` menjadi `tenant_settings`.
7. Pindahkan secret sensitif ke `tenant_secrets`.
8. Pisahkan internal ops console dari dashboard tenant.

## Catatan Penting

- secret jangan disimpan plaintext untuk SaaS
- scheduler dan worker harus menerima `tenant_id`
- log dan usage sebaiknya bisa difilter per tenant
- admin internal super-user harus dipisahkan dari user tenant biasa
- route dashboard tenant dan route internal ops sebaiknya dibedakan sejak awal
