# Roadmap SaaS 3 Bulan

## Tujuan

Membawa LoopLive AI dari aplikasi single-tenant menjadi SaaS yang:

- aman dipakai banyak customer
- punya billing dan usage tracking
- stabil untuk streaming operasional
- siap di-onboard oleh user tanpa bantuan teknis penuh

## Prinsip Prioritas

1. Multi-tenant lebih dulu daripada fitur baru.
2. Stabilitas streaming lebih penting daripada polish UI.
3. Billing tidak boleh datang sebelum isolasi data matang.
4. Self-serve onboarding baru efektif setelah fondasi operasional kuat.

## Bulan 1: Foundation

### Fokus

- ubah data model menjadi tenant-aware
- pisahkan settings global dan tenant settings
- siapkan auth, membership, dan role dasar
- siapkan batas akses per tenant
- pisahkan tenant dashboard dan internal ops console

### Deliverables

- model `tenants`
- model `tenant_users`
- model `users`
- role model untuk dashboard tenant
- relasi tenant ke:
  - live sessions
  - videos
  - sound events
  - AI settings
  - platform secrets
- middleware tenant scoping
- role dasar dashboard tenant:
  - owner
  - admin
  - operator
- rancangan internal ops console:
  - support admin
  - super admin
  - read-only ops
- migrasi data dari sistem existing ke tenant default

### Risiko

- query lama masih membaca data global
- worker/scheduler belum aware tenant
- secret settings lama masih global
- dashboard customer dan panel internal masih bercampur

## Bulan 2: Reliability and Operations

### Fokus

- worker streaming dipisah secara operasional
- tambah observability
- tambah audit trail
- tambah usage metering
- tetapkan security boundary untuk surface tenant vs internal

### Deliverables

- worker service atau worker process terpisah dari app server
- stream lifecycle event logging:
  - started
  - stopped
  - failed
  - restarted
- usage record:
  - stream hours
  - storage usage
  - AI usage
  - TTS usage
- alerting dasar untuk:
  - stream failure
  - worker crash
  - storage error
- audit log untuk:
  - login
  - settings update
  - delete asset
  - start/stop stream
- policy akses untuk `internal ops console`
  - Zero Trust / gateway
  - audit trail admin action
  - tenant impersonation yang terlacak
- session activity log untuk dashboard tenant
  - upload asset
  - edit scheduler
  - rotate stream destination

### Risiko

- stream aktif mati tapi dashboard masih `LIVE`
- cost usage tidak terukur
- support sulit investigasi insiden tenant
- surface internal terlalu terbuka
- boundary customer vs internal tidak jelas

## Bulan 3: Monetization and Self-Serve

### Fokus

- tambah billing
- tambah onboarding
- tambah halaman usage dan plan enforcement
- finalisasi perbedaan fitur tenant dan internal ops

### Deliverables

- plan model:
  - free trial
  - creator
  - studio
  - agency
- subscription lifecycle:
  - start trial
  - upgrade
  - downgrade
  - cancel
- plan limits:
  - storage
  - active streams
  - scheduled sessions
  - team members
- onboarding wizard:
  - upload first asset
  - set RTMP destination
  - create first session
  - test live
- billing page
- usage dashboard
- internal ops console minimal:
  - lookup tenant
  - reset stuck stream state
  - inspect last error
  - suspend/reactivate tenant

### Risiko

- billing aktif tapi enforcement belum konsisten
- onboarding terlalu teknis untuk user non-dev
- customer dashboard membawa terlalu banyak fitur internal

## Milestone Checklist

### Release Alpha SaaS

- tenant model aktif
- semua data sudah tenant-scoped
- auth multi-user dasar jalan
- tenant dashboard dipisah konsepnya dari internal ops

### Release Beta SaaS

- worker terpisah
- health monitoring aktif
- usage tracking dasar aktif
- internal ops console punya akses terbatas dan terproteksi

### Release Public SaaS

- billing aktif
- onboarding self-serve aktif
- support/admin tooling siap

## Saran Eksekusi

- jangan mulai billing sebelum multi-tenant selesai
- jangan jual SLA sebelum monitoring dan audit log matang
- jangan buka public signup sebelum platform secret storage aman
- jangan lindungi dashboard customer dengan gateway internal-only
- gunakan gateway/security layer terutama untuk internal ops console
