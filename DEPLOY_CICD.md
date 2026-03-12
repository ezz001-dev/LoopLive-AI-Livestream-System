# LoopLive AI VPS Deployment Guide

This guide will help you set up **GitHub Actions** to automatically update your application on your VPS whenever you push code.

## 1. Prerequisites on VPS
Ensure the following are installed on your VPS:
- **Node.js 18+**
- **PM2** (`npm install -g pm2`)
- **Git**
- **Docker & Postgres** (for the database)

## 2. Server-Side Setup
1. Clone your project to your VPS:
   ```bash
   git clone <your-repo-url>
   cd LoopLive-AI-Livestream-System
   ```
2. Make the deployment script executable:
   ```bash
   chmod +x scripts/deploy.sh
   ```
3. Update the `APP_DIR` path in `scripts/deploy.sh` to match your actual path.

## 3. GitHub Secrets Configuration
To allow GitHub to talk to your VPS, add these secrets to your repository (**Settings > Secrets and variables > Actions > New repository secret**):

| Secret Name | Description | Example |
| :--- | :--- | :--- |
| `VPS_HOST` | Your VPS IP address | `123.45.67.89` |
| `VPS_USER` | Your SSH username | `root` or `ubuntu` |
| `VPS_SSH_KEY` | Your Private SSH Key (`~/.ssh/id_rsa`) | `-----BEGIN RSA PRIVATE KEY-----...` |
| `VPS_APP_PATH` | Full path to the app directory | `/home/ubuntu/LoopLive-AI-Livestream-System` |
| `VPS_PORT` | SSH Port (optional) | `22` |

## 4. SSH Key Setup (Optional but Recommended)
If you haven't set up SSH keys:
1. Generate a key on your local machine: `ssh-keygen -t rsa -b 4096`
2. Copy the **Public Key** to your VPS: `ssh-copy-id -i ~/.ssh/id_rsa.pub user@vps-ip`
3. Copy the **Private Key** content and paste it into the `VPS_SSH_KEY` secret on GitHub.

## 5. Deployment Flow
1. You make changes to your code locally.
2. `git add .`, `git commit -m "Update"`, `git push origin main`.
3. GitHub Actions will trigger, SSH into your VPS, and run `scripts/deploy.sh`.
4. Your site is updated automatically!
