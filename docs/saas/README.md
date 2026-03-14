# SaaS Planning Docs

Dokumen ini merangkum empat area utama untuk membawa LoopLive AI dari aplikasi operasional menjadi produk SaaS.

## Isi Dokumen

1. [Roadmap SaaS 3 Bulan](./01-saas-roadmap-3-bulan.md)
2. [Desain Schema Prisma Multi-Tenant](./02-schema-prisma-multi-tenant.md)
3. [MVP SaaS vs Nice-to-Have](./03-mvp-vs-nice-to-have.md)
4. [Komponen Cost Utama](./04-komponen-cost-utama.md)

## Cara Membaca

- Mulai dari roadmap untuk melihat urutan kerja.
- Lanjut ke schema multi-tenant untuk fondasi data.
- Gunakan dokumen MVP untuk menentukan scope produk awal.
- Pakai komponen cost untuk validasi model bisnis dan pricing.

## Konteks

Asumsi yang dipakai dalam dokumen ini:

- Produk utama: livestream automation untuk YouTube dan TikTok.
- Streaming engine: FFmpeg worker yang mendorong direct RTMP ke platform.
- Storage asset: local atau Cloudflare R2.
- Admin/dashboard: Next.js + Prisma + PostgreSQL + Redis.
- Target awal: SaaS self-serve untuk creator, studio kecil, dan agency ringan.
