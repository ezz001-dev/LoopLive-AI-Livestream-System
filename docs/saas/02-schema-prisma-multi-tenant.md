# Desain Schema Prisma Multi-Tenant

## Tujuan

Mengubah struktur data LoopLive AI agar setiap customer memiliki isolasi data, settings, secret, dan usage sendiri.

## Masalah Pada Struktur Sekarang

Saat ini beberapa bagian masih terasa single-tenant:

- `system_settings` bersifat global
- `videos` belum terikat tenant
- `live_sessions` belum terikat tenant
- secret seperti API key, RTMP key, dan cookie masih belum tenant-scoped

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

### live_sessions

Tambahkan:

- `tenant_id`

### session_schedules

Opsional, bisa cukup lewat relasi `live_session`, tapi tenant-aware query tetap harus dipastikan.

### chat_logs

Sebaiknya tenant-aware secara tidak langsung lewat `live_session_id`.

### ai_reply_logs

Sebaiknya tenant-aware secara tidak langsung lewat `live_session_id`.

### sound_events

Tambahkan:

- `tenant_id`

## Arah Relasi yang Disarankan

- `tenant -> videos`
- `tenant -> live_sessions`
- `tenant -> sound_events`
- `tenant -> tenant_settings`
- `tenant -> tenant_secrets`
- `tenant -> subscriptions`
- `tenant -> usage_records`
- `user -> tenant_users -> tenant`

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

## Catatan Penting

- secret jangan disimpan plaintext untuk SaaS
- scheduler dan worker harus menerima `tenant_id`
- log dan usage sebaiknya bisa difilter per tenant
- admin internal super-user harus dipisahkan dari user tenant biasa
