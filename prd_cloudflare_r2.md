# PRD: Integrasi Cloudflare R2 (Object Storage)

**Status**: Draft / Menunggu Review  
**Tujuan**: Mengurangi beban CPU dan penggunaan disk pada VPS dengan memindahkan penyimpanan video ke Cloudflare R2.

---

## 1. Latar Belakang
Saat ini, semua video diunggah dan disimpan langsung di disk lokal VPS. Hal ini menyebabkan:
- **CPU Spikes**: Proses baca/tulis file besar mengonsumsi resource CPU yang seharusnya digunakan untuk FFmpeg/AI.
- **Disk Saturation**: Kapasitas disk VPS terbatas dan mahal untuk ditambah.
- **I/O Bottleneck**: Saat banyak sesi live berjalan, pembacaan file dari disk secara bersamaan bisa memperlambat performa sistem.

## 2. Sasaran (Objectives)
- **Skalabilitas**: Mendukung penyimpanan video hingga ukuran Terabyte tanpa membebani VPS.
- **Efisiensi**: Menghilangkan beban I/O disk lokal dari server utama.
- **Reliabilitas**: Video tetap tersedia meskipun VPS mengalami gangguan atau perlu di-restart.

## 3. Fitur Utama
### A. Streaming Upload ke R2
- Mengubah alur upload di aplikasi agar data video tidak disimpan di folder `public/videos`.
- Menggunakan **S3-compatible API** untuk mengirim potongan data (chunks) langsung ke Cloudflare R2 saat user mengunggah.

### B. Manajemen Database
- Menambahkan kolom `storage_provider` (local vs r2) di tabel `videos`.
- Database akan menyimpan URL publik/privat dari R2 sebagai referensi lokasi file.

### C. Alur Streaming FFmpeg
- Memodifikasi `WorkerManager` agar FFmpeg menerima input berupa **URL** (HTTP) dari Cloudflare R2, bukan path file lokal.
- FFmpeg mendukung *native selective reading* dari URL, yang sangat efisien untuk memutar video dalam loop.

### D. Keamanan
- Menggunakan **Pre-signed URLs** (opsional) jika ingin video hanya bisa diakses oleh aplikasi dan tidak bisa diunduh oleh publik secara bebas.

## 4. Persyaratan Teknis
- **Library**: `@aws-sdk/client-s3` (SDK standar untuk R2).
- **Environment Variables**:
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_ENDPOINT` (URL unik bucket R2 Anda)
  - `R2_BUCKET_NAME`
  - `R2_PUBLIC_URL`

## 5. Rencana Fase Implementasi
- **Fase 1**: Konfigurasi SDK dan pengujian koneksi ke Cloudflare R2.
- **Fase 2**: Implementasi *streaming uploader* dari UI Dashboard ke R2.
- **Fase 3**: Update logic `WorkerManager` untuk mendukung input video via URL.
- **Fase 4**: Migrasi video lama dari VPS ke Cloudflare R2 (Clean up).

## 6. Dampak yang Diharapkan
- Penggunaan CPU VPS turun 15-25% saat proses upload/streaming.
- Penggunaan Disk VPS turun hingga mendekati 0GB untuk data video.
- Proses booting/start live session menjadi lebih cepat.

---

**Disusun Oleh**: ADI  
**Tanggal**: 13 Maret 2026
