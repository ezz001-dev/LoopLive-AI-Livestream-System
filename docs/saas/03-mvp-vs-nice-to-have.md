# MVP SaaS vs Nice-to-Have

## Tujuan

Memisahkan fitur yang wajib ada agar produk bisa dijual, dari fitur yang bagus tetapi belum harus masuk release awal.

## MVP SaaS

### Tenant Dashboard

- signup dan login
- workspace tunggal per tenant
- dashboard untuk upload video, create session, edit scheduler, dan start/stop stream
- role tenant dasar:
  - owner
  - admin
  - operator

### Core Product

- upload video ke storage
- create/edit/delete live session
- direct RTMP ke YouTube/TikTok
- start/stop stream manual
- scheduler dasar
- AI persona per session
- video loop configuration
- R2 asset library

### Reliability

- worker restart dasar
- stream error state di dashboard
- storage health check
- log stream dasar
- usage tracking dasar

### Security

- hashed password
- session auth aman
- tenant data isolation
- encrypted secret storage
- audit log dasar untuk aksi penting
- CSRF/session hardening untuk tenant dashboard

### Internal Ops

- internal ops console terpisah dari dashboard tenant
- lookup tenant
- reset stream state
- lihat last error
- suspend/reactivate tenant
- akses internal dilindungi gateway / Zero Trust

### Billing

- free trial
- minimal 2 atau 3 plan
- subscription activate/cancel
- limit enforcement sederhana

### Supportability

- internal support bisa melihat tenant dengan audit trail
- lihat usage tenant
- lihat error terakhir

## Nice-to-Have

### Product Depth

- multi-user collaboration lengkap
- komentar internal antar operator
- approval workflow
- scene/profile preset banyak
- sound effect / TTS / ducking sebagai fitur interaktif lanjutan

### Streaming Depth

- multi-destination broadcast
- transcoding profile berbeda per output
- stream backup/failover
- adaptive internal preview

### Growth Features

- affiliate/referral
- template onboarding by niche
- analytics conversion dashboard
- branded white-label workspace

### Enterprise

- SSO
- custom SLA
- audit log lengkap
- data retention policy custom
- dedicated worker cluster

## Rekomendasi Scope MVP Pertama

Fitur yang paling masuk akal untuk dijual lebih dulu:

- 1 tenant = 1 workspace
- 1 owner account
- tenant-facing dashboard yang sederhana dan stabil
- direct stream ke YouTube/TikTok
- video upload ke R2
- session scheduler
- AI chat persona
- stream monitoring dasar
- simple usage quota
- internal ops console minimum untuk support

## Fitur yang Sebaiknya Ditunda

- white-label
- multi-brand asset library
- custom domain playback
- advanced analytics
- collaboration yang terlalu kompleks
- enterprise IAM/SSO

## Definisi MVP Siap Jual

Produk MVP dianggap siap dijual jika:

- user bisa daftar sendiri
- user bisa upload asset
- user bisa membuat session
- user bisa start live ke platform
- platform secret tersimpan aman
- dashboard menunjukkan status yang jujur
- billing dan limit plan sudah aktif
- surface tenant dan internal ops tidak bercampur

## Red Flags Jika Dipaksakan Masuk MVP

- worker belum stabil tapi billing sudah aktif
- multi-tenant belum matang tapi public signup dibuka
- secret masih plaintext
- support belum bisa melihat insiden tenant
- dashboard customer masih diperlakukan seperti panel internal
