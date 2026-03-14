# MVP SaaS vs Nice-to-Have

## Tujuan

Memisahkan fitur yang wajib ada agar produk bisa dijual, dari fitur yang bagus tetapi belum harus masuk release awal.

## MVP SaaS

### Core Product

- signup dan login
- tenant/workspace tunggal per customer
- upload video ke storage
- create/edit/delete live session
- direct RTMP ke YouTube/TikTok
- start/stop stream manual
- scheduler dasar
- AI persona per session

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

### Billing

- free trial
- minimal 2 atau 3 plan
- subscription activate/cancel
- limit enforcement sederhana

### Supportability

- admin internal view untuk tenant
- reset stream state
- lihat error terakhir
- lihat usage tenant

## Nice-to-Have

### Product Depth

- multi-user collaboration lengkap
- komentar internal antar operator
- approval workflow
- scene/profile preset banyak

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
- direct stream ke YouTube/TikTok
- video upload ke R2
- session scheduler
- AI chat persona
- stream monitoring dasar
- simple usage quota

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

## Red Flags Jika Dipaksakan Masuk MVP

- worker belum stabil tapi billing sudah aktif
- multi-tenant belum matang tapi public signup dibuka
- secret masih plaintext
- support belum bisa melihat insiden tenant
