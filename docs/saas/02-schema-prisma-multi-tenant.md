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

## Draft Prisma Schema Siap Implementasi

Bagian ini adalah draft yang lebih dekat ke implementasi nyata di branch SaaS. Tujuannya bukan untuk langsung di-copy mentah ke production, tetapi untuk menjadi baseline refactor yang konsisten dengan schema LoopLive saat ini.

Prinsip draft ini:

- mempertahankan model utama yang sudah ada
- menambahkan `tenant_id` pada data tenant-facing
- memisahkan identity user tenant dan admin internal
- menyiapkan settings, secrets, subscription, usage, dan audit

```prisma
model tenants {
  id         String   @id @default(uuid())
  name       String
  slug       String   @unique
  status     String   @default("active")
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  settings       tenant_settings?
  users          tenant_users[]
  videos         videos[]
  live_sessions  live_sessions[]
  sound_events   sound_events[]
  secrets        tenant_secrets[]
  subscriptions  subscriptions[]
  usage_records  usage_records[]
  audit_logs     audit_logs[]
}

model users {
  id            String   @id @default(uuid())
  email         String   @unique
  password_hash String
  display_name  String?
  status        String   @default("active")
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  tenants       tenant_users[]
  audit_logs    audit_logs[]
  internal_role internal_admins?
}

model tenant_users {
  id         String   @id @default(uuid())
  tenant_id  String
  user_id    String
  role       String   @default("owner")
  created_at DateTime @default(now())

  tenant tenants @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  user   users   @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([tenant_id, user_id])
}

model internal_admins {
  id         String   @id @default(uuid())
  user_id     String   @unique
  role        String   @default("support_admin")
  status      String   @default("active")
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  user users @relation(fields: [user_id], references: [id], onDelete: Cascade)
}

model tenant_settings {
  id                         String   @id @default(uuid())
  tenant_id                   String   @unique
  ai_provider                 String   @default("openai")
  tts_provider                String   @default("openai")
  yt_channel_handle           String?
  tiktok_channel_handle       String?
  ai_name                     String   @default("Loop")
  ai_persona                  String?  @db.Text
  ai_tone_default             String   @default("friendly")
  max_response_length         Int      @default(150)
  storage_provider            String   @default("r2")
  r2_public_url               String?
  r2_signed_reads             Boolean  @default(false)
  r2_signed_read_ttl_seconds  Int      @default(43200)
  default_loop_mode           String   @default("infinite")
  updated_at                  DateTime @updatedAt

  tenant tenants @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
}

model tenant_secrets {
  id              String   @id @default(uuid())
  tenant_id        String
  key              String
  encrypted_value  String
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt

  tenant tenants @relation(fields: [tenant_id], references: [id], onDelete: Cascade)

  @@unique([tenant_id, key])
}

model subscriptions {
  id                       String   @id @default(uuid())
  tenant_id                 String
  plan_code                 String
  status                    String   @default("trialing")
  billing_provider          String?
  billing_customer_id       String?
  billing_subscription_id   String?
  trial_ends_at             DateTime?
  current_period_end        DateTime?
  created_at                DateTime @default(now())
  updated_at                DateTime @updatedAt

  tenant tenants @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
}

model usage_records {
  id           String   @id @default(uuid())
  tenant_id     String
  metric        String
  quantity      Decimal  @db.Decimal(18, 4)
  period_start  DateTime
  period_end    DateTime
  metadata      Json?
  created_at    DateTime @default(now())

  tenant tenants @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
}

model audit_logs {
  id            String   @id @default(uuid())
  tenant_id      String?
  actor_user_id  String?
  actor_type     String
  action         String
  target_type    String
  target_id      String?
  metadata       Json?
  created_at     DateTime @default(now())

  tenant tenants? @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  user   users?   @relation(fields: [actor_user_id], references: [id], onDelete: SetNull)
}
```

## Patch ke Model Existing

Untuk branch SaaS, model yang sudah ada sekarang paling realistis diubah seperti ini:

### `videos`

Tambahkan:

```prisma
tenant_id String
tenant    tenants @relation(fields: [tenant_id], references: [id], onDelete: Cascade)

@@index([tenant_id, created_at])
```

Tetap pertahankan field existing:

- `file_size`
- `storage_provider`
- `storage_key`
- `public_url`

### `live_sessions`

Tambahkan:

```prisma
tenant_id String
tenant    tenants @relation(fields: [tenant_id], references: [id], onDelete: Cascade)

@@index([tenant_id, status])
@@index([tenant_id, created_at])
```

Tetap pertahankan field existing:

- `target_rtmp_url`
- `stream_key`
- `loop_mode`
- `loop_count`
- field schedule legacy dan `session_schedules`

### `sound_events`

Tambahkan:

```prisma
tenant_id String
tenant    tenants @relation(fields: [tenant_id], references: [id], onDelete: Cascade)

@@index([tenant_id, active])
```

### `session_schedules`

Minimal tetap bergantung pada `live_session_id`, tetapi pada tahap implementasi query harus selalu tenant-scoped lewat relasi `live_session`.

## Route Split yang Disarankan

Supaya schema ini benar-benar berguna, route aplikasi sebaiknya sejak awal dibedakan:

- `tenant dashboard`
  Contoh:
  - `/app`
  - `/app/videos`
  - `/app/live`
  - `/app/settings`

- `internal ops console`
  Contoh:
  - `/ops`
  - `/ops/tenants`
  - `/ops/incidents`
  - `/ops/audit`

Tujuannya agar:

- auth boundary jelas
- role model tidak campur
- support tooling tidak bocor ke tenant

## Rekomendasi Implementasi Tahap 1

Kalau ingin mulai implementasi branch SaaS tanpa terlalu besar sekali jalan, urutan paling aman:

1. buat `tenants`, `users`, `tenant_users`
2. tambahkan `tenant_id` ke `videos`, `live_sessions`, `sound_events`
3. buat tenant default untuk semua data lama
4. backfill semua row lama
5. ubah auth dari `admin_users` ke `users`
6. baru pecah `system_settings` menjadi `tenant_settings` dan `tenant_secrets`

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
