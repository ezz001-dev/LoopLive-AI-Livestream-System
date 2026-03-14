# Komponen Cost Utama

## Tujuan

Mengidentifikasi cost utama jika LoopLive AI dijual sebagai SaaS streaming automation.

## 1. Compute

Compute akan menjadi salah satu cost terbesar karena FFmpeg adalah workload aktif.

Komponen:

- app server Next.js
- tenant-facing dashboard traffic
- internal ops console
- worker streaming FFmpeg
- scheduler/background jobs
- Redis worker

Driver cost:

- jumlah stream aktif bersamaan
- resolusi dan bitrate output
- durasi live per hari
- jumlah retry atau restart
- kompleksitas audio interaktif:
  - TTS
  - sound effect
  - ducking/mixing

Catatan:

- worker FFmpeg biasanya lebih mahal daripada dashboard web biasa
- concurrent stream adalah metrik harga yang sangat penting
- internal ops console biasanya bukan cost terbesar, tapi tetap perlu dipisahkan dari dashboard tenant secara operasional

## 2. Storage

Storage dibutuhkan untuk asset video dan kemungkinan audio/log.

Komponen:

- object storage video
- audio TTS sementara
- audio event/sound file
- log retention opsional

Driver cost:

- total GB video per tenant
- jumlah upload baru
- retensi asset lama

Catatan:

- R2 cocok untuk menekan egress storage tertentu
- lifecycle policy akan penting saat scale

## 3. Network and Bandwidth

Ini sangat penting untuk streaming.

Komponen:

- ingress dari R2 ke worker
- egress dari worker ke YouTube/TikTok RTMP
- trafik dashboard
- trafik internal ops console

Driver cost:

- bitrate stream
- durasi stream
- jumlah stream bersamaan
- internal preview jika tetap disediakan
- jumlah user tenant aktif di dashboard

Catatan:

- walau source di R2, VPS worker tetap mengonsumsi bandwidth
- stream 24/7 membuat network jadi biaya yang sangat nyata

## 4. AI Cost

Kalau persona AI menjadi fitur inti, ini akan jadi cost langsung per penggunaan.

Komponen:

- LLM tokens
- TTS generation
- prompt orchestration

Driver cost:

- jumlah pesan chat
- panjang reply
- model yang dipakai
- durasi live

Catatan:

- AI cost cocok dijadikan metrik usage-based
- perlu guardrail supaya tenant tidak boros tak terbatas

## 5. Database and Queue

Komponen:

- PostgreSQL
- Redis

Driver cost:

- jumlah tenant
- jumlah session
- jumlah log
- jumlah event worker

Catatan:

- biasanya bukan cost terbesar di awal
- bisa jadi bottleneck kalau logging terlalu verbose

## 6. Monitoring and Support

Komponen:

- log aggregation
- metrics
- alerting
- support tools
- internal ops access layer / Zero Trust gateway

Driver cost:

- volume log FFmpeg
- jumlah tenant
- kebutuhan observability per stream
- jumlah intervensi support internal

Catatan:

- sering diremehkan, padahal penting untuk SaaS production

## 7. Payment and Billing

Komponen:

- payment processor fee
- invoice service
- tax/compliance tooling

Driver cost:

- MRR
- negara customer
- metode pembayaran

## Cost Driver Paling Penting

Untuk LoopLive AI, tiga driver paling penting kemungkinan:

1. concurrent active streams
2. average stream duration
3. AI/TTS usage per stream

Driver lain yang juga relevan:

4. audio interaktif per stream
5. jumlah tenant aktif yang mengakses dashboard bersamaan

## Metrik yang Perlu Dicatat Sejak Awal

- active streams per tenant
- stream minutes per tenant
- total storage GB per tenant
- AI token usage per tenant
- TTS seconds per tenant
- failed stream count
- worker restart count
- support intervention count
- number of internal admin actions

## Rekomendasi Model Harga

### Model 1: Subscription + Usage

- biaya dasar bulanan
- tambahan untuk stream hours
- tambahan untuk AI/TTS

Cocok untuk:

- cost yang cukup variatif
- tenant dengan intensitas pemakaian berbeda

### Model 2: Tiered Plan

- plan creator
- plan studio
- plan agency

Setiap plan punya limit:

- storage
- stream hours
- active streams
- seats

Cocok untuk:

- user yang ingin harga mudah dipahami

### Model 3: Hybrid

- base plan
- soft quota
- overage di atas limit

Ini biasanya paling fleksibel.

## Contoh Batas Pricing yang Masuk Akal

### Creator

- 1 active stream
- storage kecil
- scheduler dasar
- AI usage terbatas

### Studio

- 3 active streams
- storage lebih besar
- multi-user terbatas
- AI usage lebih longgar

### Agency

- banyak workspace atau banyak channel
- lebih banyak stream aktif
- prioritas support

## Kesimpulan

Untuk SaaS seperti ini, cost bukan terutama dari dashboard web, melainkan dari:

- FFmpeg worker runtime
- bandwidth streaming
- AI/TTS usage

Namun secara arsitektur, tetap penting membedakan:

- `tenant-facing dashboard`
- `internal ops console`

karena walau cost internal ops biasanya lebih kecil, kebocoran akses atau support tooling yang buruk bisa menjadi biaya operasional yang besar.

Karena itu pricing sebaiknya jangan hanya berbasis jumlah user, tetapi juga berbasis workload streaming.
