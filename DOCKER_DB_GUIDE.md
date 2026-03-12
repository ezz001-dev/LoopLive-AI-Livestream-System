# Panduan Koneksi Database Docker ke Aplikasi

Dokumen ini menjelaskan bagaimana aplikasi LoopLive AI (Next.js & Prisma) berkomunikasi dengan database yang berjalan di dalam kontainer Docker.

## 1. Konfigurasi Port
Dalam `docker-compose.yml`, kita memetakan port internal kontainer ke port host:
```yaml
ports:
  - "5432:5432"
```
Ini berarti database dapat diakses dari komputer Anda (Host) melalui `localhost:5432`.

## 2. Pengaturan `.env`
Pastikan file `.env` di root project memiliki baris berikut:

```env
DATABASE_URL="postgresql://looplive_user:looplive_password@localhost:5432/looplive_db"
```

**Penjelasan URL:**
- `postgresql://`: Protokol database.
- `looplive_user`: Nama user (sesuai `POSTGRES_USER` di docker-compose).
- `looplive_password`: Password (sesuai `POSTGRES_PASSWORD` di docker-compose).
- `localhost:5432`: Alamat host dan port yang dibuka oleh Docker.
- `looplive_db`: Nama database (sesuai `POSTGRES_DB` di docker-compose).

---

## 3. Inisialisasi Database (Prisma)
Setelah Docker berjalan (`docker-compose up -d`), jalankan perintah ini untuk membuat tabel:
```bash
npx prisma db push
```
Jika berhasil, Anda akan melihat pesan "The database is now in sync with your Prisma schema".

---

## 4. Troubleshooting Koneksi

### A. Error: "P1001: Can't reach database server"
- **Penyebab:** Docker belum jalan atau port 5432 sedang dipakai aplikasi lain (seperti PostgreSQL instalasi native).
- **Solusi:** 
  1. Jalankan `docker ps` untuk memastikan kontainer `looplive-postgres` statusnya `Up`.
  2. Matikan service PostgreSQL native jika ada (lewat `services.msc` di Windows).
  3. Jalankan ulang docker: `docker-compose down` lalu `docker-compose up -d`.

### B. Mengakses dari Dalam Kontainer Lain
Jika di masa depan Anda memasukkan aplikasi ke dalam Docker juga, ganti `localhost` menjadi nama service:
`DATABASE_URL="postgresql://looplive_user:looplive_password@postgres:5432/looplive_db"`

---

## 5. Cek Data (Prisma Studio)
Untuk melihat isi tabel secara visual tanpa tool SQL tambahan, jalankan:
```bash
npx prisma studio
```
Lalu buka [http://localhost:5555](http://localhost:5555).
