# Ubuntu 22.04 VPS Deployment Guide (SSH + GitHub)

Panduan ini menjelaskan cara menyiapkan VPS Ubuntu 22.04 Anda dari awal hingga siap digunakan dengan sistem CI/CD otomatis.

## 1. Persiapan Awal di VPS
Setelah login ke VPS Anda via terminal, jalankan perintah berikut:

### Update Sistem
```bash
sudo apt update && sudo apt upgrade -y
```

### Install Node.js (Version 20)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Install Library Esensial
```bash
sudo apt install -y git ffmpeg build-essential
```

### Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

---

## 2. Setting SSH Key untuk GitHub
Agar VPS bisa menarik kode dari GitHub dengan aman:

1. **Generate Key Baru di VPS:**
   ```bash
   ssh-keygen -t ed25519 -C "your-email@example.com"
   ```
   *(Tekan Enter terus sampai selesai)*

2. **Ambil Public Key:**
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
3. **Copy teks yang muncul**, lalu buka GitHub:
   - Masuk ke **Settings > SSH and GPG keys**.
   - Klik **New SSH Key**, beri nama "VPS LoopLive", dan paste kodenya.

4. **Tes Koneksi:**
   ```bash
   ssh -T git@github.com
   ```

---

## 3. Clone Proyek & Setup
```bash
mkdir -p ~/apps && cd ~/apps
git clone git@github.com:USERNAME/REPO_NAME.git 
cd LoopLive-AI-Livestream-System

# Install Dependencies
npm install

# Setup Environment
cp .env.example .env
nano .env # Isi dengan kredensial Anda (Database, API Keys, dll)
```

---

## 4. Konfigurasi Firewall (UFW)
Buka port yang diperlukan:
```bash
sudo ufw allow 22       # SSH
sudo ufw allow 3000     # Next.js App
sudo ufw allow 3001     # Socket.io
sudo ufw allow 1935     # RTMP Stream
sudo ufw allow 80       # HTTP
sudo ufw allow 443      # HTTPS (jika pakai SSL)
sudo ufw enable
```

---

## 5. Install & Konfigurasi Nginx
Agar aplikasi bisa diakses lewat domain/IP tanpa port 3000:

1. **Install Nginx:**
   ```bash
   sudo apt install -y nginx
   ```

2. **Buat Konfigurasi Situs:**
   ```bash
   sudo nano /etc/nginx/sites-available/looplive
   ```
   *Salin isi dari file `nginx.conf.example` di proyek Anda ke sini.*

3. **Aktifkan Konfigurasi:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/looplive /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## 6. Menghubungkan ke GitHub Actions (Automation)
Agar fitur `git push` otomatis mengupdate server, Anda perlu memasukkan **Private Key** VPS ke GitHub Secrets.

1. **Ambil Private Key di VPS:**
   ```bash
   cat ~/.ssh/id_ed25519
   ```
2. **Copy seluruh teks** (termasuk BEGIN dan END).
3. **Buka GitHub Repository Anda:**
   - Masuk ke **Settings > Secrets and variables > Actions**.
   - Tambahkan Secret baru bernama `VPS_SSH_KEY` dan paste isinya.
   - Tambahkan juga `VPS_HOST` (IP VPS), dan `VPS_USER` (biasanya 'root' atau 'ubuntu').

---

## 6. Jalankan Aplikasi Pertama Kali
```bash
npx prisma db push
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Sekarang setiap kali Anda `git push` ke GitHub, server Anda akan otomatis Terupdate!
