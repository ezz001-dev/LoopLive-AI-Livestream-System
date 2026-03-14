# Internal Access Modes

Dokumen ini menjelaskan cara mengamankan deployment internal tanpa bergantung pada whitelist IP publik yang sering berubah.

## Rekomendasi Singkat

Untuk setup Anda sekarang, rekomendasi utamanya adalah:

1. `Cloudflare Zero Trust / reverse proxy header`
2. `Tailscale` jika suatu hari butuh jalur privat tambahan
3. `Login app saja` hanya untuk testing cepat

Mode `ip_whitelist` tetap tersedia, tapi tidak ideal kalau IP Anda dinamis.

## Env Baru

Tambahkan atau ubah env berikut:

```env
INTERNAL_ACCESS_MODE="proxy_header"
ALLOWED_IPS=""
INTERNAL_AUTH_PROXY_HEADER="cf-access-authenticated-user-email"
INTERNAL_AUTH_PROXY_VALUE=""
```

Nilai `INTERNAL_ACCESS_MODE` yang didukung:

- `disabled`
- `ip_whitelist`
- `tailscale`
- `proxy_header`

## Mode 1: Cloudflare Zero Trust / Reverse Proxy Header

Mode ini paling cocok untuk kondisi Anda sekarang karena domain sudah ada di Cloudflare dan Anda tidak ingin repot dengan IP publik yang berubah.

Setup umum:

```env
INTERNAL_ACCESS_MODE="proxy_header"
INTERNAL_AUTH_PROXY_HEADER="cf-access-authenticated-user-email"
INTERNAL_AUTH_PROXY_VALUE=""
```

Atau jika proxy Anda menambahkan header rahasia khusus:

```env
INTERNAL_ACCESS_MODE="proxy_header"
INTERNAL_AUTH_PROXY_HEADER="x-internal-access"
INTERNAL_AUTH_PROXY_VALUE="my-shared-secret"
```

Cara kerja:

- request hanya lolos jika header yang diharapkan ada
- jika `INTERNAL_AUTH_PROXY_VALUE` diisi, nilainya juga harus cocok

Penting:

- mode ini sebaiknya dipakai hanya jika origin tidak diekspos langsung ke internet
- kalau origin masih terbuka publik, orang bisa mencoba spoof header
- idealnya kombinasikan dengan firewall, Cloudflare Tunnel, atau expose origin hanya lewat Cloudflare

## Mode 2: Tailscale

Mode ini paling cocok untuk internal team kecil.

Cara kerja:

- app hanya menerima request dari IP loopback, private LAN, atau range Tailscale `100.64.0.0/10`
- Anda tidak perlu update whitelist tiap IP internet berubah

Setup:

1. Install Tailscale di VPS/server.
2. Install Tailscale di laptop atau PC admin.
3. Akses app lewat IP atau hostname Tailscale.
4. Set:

```env
INTERNAL_ACCESS_MODE="tailscale"
```

Catatan:

- Mode ini aman jika akses utama memang melalui jaringan private/Tailscale.
- Jika app masih dibuka langsung ke internet publik, pastikan firewall server tetap membatasi port.

## Mode 3: Exact IP Whitelist

Kalau tetap ingin whitelist manual:

```env
INTERNAL_ACCESS_MODE="ip_whitelist"
ALLOWED_IPS="114.10.148.236,1.2.3.4"
```

Kekurangan:

- repot jika IP berubah
- kurang cocok untuk koneksi rumah, hotspot, atau provider seluler

## Mode 4: Disabled

Untuk pengujian cepat:

```env
INTERNAL_ACCESS_MODE="disabled"
```

Artinya:

- gate network dimatikan
- proteksi utama mengandalkan login app

Mode ini paling nyaman untuk development, tapi pastikan production tetap memakai HTTPS, password kuat, dan reverse proxy/firewall.

## Perilaku di Aplikasi

Pengecekan akses internal dilakukan di:

- [src/proxy.ts](/e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/src/proxy.ts)

Route yang dilindungi:

- `/login`
- `/admin/*`
- `/api/live/*`
- `/api/videos/*`

## Rekomendasi Praktis untuk Anda

Untuk setup Anda sekarang:

1. pakai `INTERNAL_ACCESS_MODE="proxy_header"`
2. set `INTERNAL_AUTH_PROXY_HEADER="cf-access-authenticated-user-email"`
3. kosongkan `ALLOWED_IPS`
4. letakkan admin di belakang Cloudflare Access
5. pertahankan login app yang sudah ada sebagai lapisan kedua

Kalau nanti perlu jalur maintenance yang lebih privat:

1. gunakan `Tailscale` untuk SSH atau akses server internal
2. tetap biarkan admin web lewat Cloudflare Zero Trust
