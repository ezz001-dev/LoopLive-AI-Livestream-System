# Cloudflare Zero Trust Admin Setup

Panduan ini menjelaskan cara mengamankan panel admin LoopLive menggunakan `Cloudflare Zero Trust` dengan subdomain khusus seperti `admin.fluxo-ai.pro`.

## Tujuan

Setup ini dipakai agar:

- panel admin tidak bergantung pada whitelist IP publik
- akses admin tetap nyaman lewat domain
- request admin hanya lolos jika sudah melewati Cloudflare Access

## Arsitektur Singkat

Alur request:

1. admin membuka `https://admin.fluxo-ai.pro`
2. Cloudflare Access meminta login/verifikasi
3. jika lolos policy, Cloudflare meneruskan request ke origin
4. Nginx meneruskan header Access ke Next.js
5. app memverifikasi header di [src/proxy.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/proxy.ts)

## 1. Siapkan Subdomain Admin

Di Cloudflare Dashboard:

1. buka domain `fluxo-ai.pro`
2. masuk ke menu `DNS`
3. tambahkan record:
   - `Type`: `A`
   - `Name`: `admin`
   - `IPv4 address`: IP publik server Google Cloud
   - `Proxy status`: `Proxied`

Hasil akhirnya:

- `admin.fluxo-ai.pro` mengarah ke server yang sama
- traffic admin lewat Cloudflare, bukan langsung ke origin

## 2. Konfigurasi Cloudflare Access

Di `Zero Trust`:

1. buka `Access`
2. pilih `Applications`
3. klik `Add an application`
4. pilih `Self-hosted`
5. isi hostname:
   - `admin.fluxo-ai.pro`
6. buat policy `Allow`

Contoh policy awal:

- `Action`: `Allow`
- `Include`: `Emails`
- isi dengan email admin Anda

Jika muncul pesan:

`You don't have permission to view this.`

artinya Access sudah aktif, tetapi email Anda belum termasuk policy `Allow`.

## 3. Konfigurasi .env

Gunakan mode berikut di server:

```env
INTERNAL_ACCESS_MODE="proxy_header"
ALLOWED_IPS=""
INTERNAL_AUTH_PROXY_HEADER="cf-access-authenticated-user-email"
INTERNAL_AUTH_PROXY_VALUE=""
```

Artinya:

- app mempercayai request admin hanya jika membawa header dari Cloudflare Access
- whitelist IP publik tidak dipakai lagi

## 4. Konfigurasi Nginx

Gunakan server block seperti contoh di [nginx.conf.example](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/nginx.conf.example).

Contoh final:

```nginx
server {
    listen 80;
    server_name admin.fluxo-ai.pro;

    client_max_body_size 500M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;

        proxy_set_header Cf-Access-Authenticated-User-Email $http_cf_access_authenticated_user_email;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001/socket.io/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Cf-Access-Authenticated-User-Email $http_cf_access_authenticated_user_email;

        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

Setelah update config:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 5. Restart App

Setelah `.env` berubah:

```bash
npm run pm2:restart
```

## 6. Cara Test

Test yang benar:

1. buka `https://admin.fluxo-ai.pro`
2. login lewat Cloudflare Access bila diminta
3. setelah lolos Access, baru masuk ke login/app LoopLive

Test yang salah:

- buka IP server langsung
- buka `localhost`
- buka domain origin yang tidak diproteksi Access

## 7. Troubleshooting

### Error: `Access Denied: Request tidak membawa trusted proxy header...`

Periksa:

1. subdomain admin benar-benar `Proxied`
2. Access application dipasang untuk `admin.fluxo-ai.pro`
3. Nginx meneruskan header:
   - `Cf-Access-Authenticated-User-Email`
4. Anda mengakses lewat domain admin, bukan IP origin

### Error: `You don't have permission to view this.`

Artinya:

- Cloudflare Access aktif
- tetapi policy belum mengizinkan akun Anda

Solusi:

1. buka policy Access
2. tambahkan email Anda ke aturan `Allow`

### Log app menunjukkan `PROXY_HEADER_CHECK ... Result=false`

Artinya header Access belum sampai ke Next.js.

Periksa:

1. Access app aktif di host admin
2. Nginx sudah forward header Access
3. `.env` memakai:

```env
INTERNAL_ACCESS_MODE="proxy_header"
INTERNAL_AUTH_PROXY_HEADER="cf-access-authenticated-user-email"
```

## 8. Rekomendasi Operasional

Untuk setup saat ini:

- subdomain publik seperti `live.fluxo-ai.pro` tetap bisa dipakai untuk halaman publik
- subdomain admin seperti `admin.fluxo-ai.pro` diproteksi Access
- login internal LoopLive tetap dipertahankan sebagai lapisan keamanan kedua
