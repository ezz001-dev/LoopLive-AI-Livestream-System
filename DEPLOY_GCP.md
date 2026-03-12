# Deployment Guide to Google Cloud Platform (GCP) Compute Engine

Panduan ini spesifik untuk Anda yang menggunakan **Google Cloud VM Instance** (Ubuntu 22.04).

## 1. Setup Instance di Google Cloud Console
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Navigasi ke **Compute Engine > VM Instances**.
3. Klik **Create Instance**:
   - **Machine type**: Minimal `e2-medium` (2 vCPU, 4GB RAM) direkomendasikan untuk streaming.
   - **Boot disk**: Pilih **Ubuntu 22.04 LTS**.
   - **Firewall**: Centang **Allow HTTP traffic** dan **Allow HTTPS traffic**.

## 2. Konfigurasi Firewall Virtual Private Cloud (VPC)
Berbeda dengan VPS biasa, Google Cloud memiliki firewall eksternal yang harus dikonfigurasi melalui Console:

1. Pergi ke **VPC Network > Firewall**.
2. Klik **Create Firewall Rule**:
   - **Name**: `allow-looplive-streaming`
   - **Targets**: All instances in the network
   - **Source IPv4 ranges**: `0.0.0.0/0`
   - **Protocols and ports**:
     - TCP: `1935` (RTMP), `3001` (Socket.io), `3000` (Next.js - opsional jika tidak pakai Nginx).
3. Simpan.

## 3. Reservasi Static External IP
Secara default, IP Google VM bisa berubah. Agar tidak repot ganti-ganti konfig:
1. Pergi ke **VPC Network > IP addresses**.
2. Cari IP instance Anda, ganti Type-nya ke **Static**. Beri nama "looplive-static-ip".

---

## 4. Akses SSH via Cloud Shell
Anda bisa buka terminal langsung dari browser di Console GCP atau menggunakan `gcloud`:
```bash
gcloud compute ssh --project YOUR_PROJECT_ID --zone YOUR_ZONE INSTANCE_NAME
```

---

## 5. Instalasi (Sama seperti Ubuntu Biasa)
Setelah masuk ke SSH, jalankan setup yang sudah saya buat di panduan sebelumnya:

```bash
# Update & Install Tools
sudo apt update && sudo apt install -y git ffmpeg nodejs npm

# Install PM2
sudo npm install -g pm2

# Clone & Setup
git clone git@github.com:USERNAME/REPO.git
# ... ikuti langkah di manual_deployment_ubuntu.md
```

## 6. Tips Spesifik GCP
- **External IP vs Internal IP**: Saat menyeting `DATABASE_URL` atau Redis di `.env`, jika database ada di VM yang sama, gunakan `127.0.0.1`. Jika di VM berbeda dalam satu VPC, gunakan Internal IP untuk kecepatan lebih tinggi dan biaya lebih rendah.
- **Disk Space**: Pastikan disk space cukup (minimal 20GB) karena Next.js build dan folder `node_modules` cukup besar.

---

### Panduan Lanjutan:
- [manual_deployment_ubuntu.md](file:///e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/manual_deployment_ubuntu.md) (Langkah install software)
- [nginx.conf.example](file:///e:/PROJECT/Next-JS/LoopLive-AI-Livestream-System/nginx.conf.example) (Setup domain/proxy)
