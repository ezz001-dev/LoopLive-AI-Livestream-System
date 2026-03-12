#!/bin/bash

# Configuration
APP_DIR="/path/to/your/app/LoopLive-AI-Livestream-System" # User should update this
BRANCH="main"

echo "🚀 Starting Deployment..."

# Navigate to app directory
cd $APP_DIR || { echo "❌ Directory not found"; exit 1; }

# Pull latest code
echo "📥 Pulling latest code from $BRANCH..."
git fetch origin $BRANCH
git reset --hard origin/$BRANCH

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false

# Generate Prisma Client
echo "💎 Generating Prisma Client..."
npx prisma generate

# Apply database migrations/schema
echo "🗄️ Updating database schema..."
npx prisma db push --accept-data-loss # Use with caution, db push is faster for dev/solo-ops

# Build application
echo "🏗️ Building application..."
npm run build

# Restart PM2
echo "🔄 Restarting application with PM2..."
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
pm2 save

echo "✅ Deployment Successful!"
