#!/bin/bash
set -e

echo "🚀 Starting deployment..."

cd /home/rachid/Projects/Narrateur-Dashboard

echo "📥 Pulling latest code..."
git pull origin main

echo "📦 Installing production dependencies..."
npm ci --omit=dev

echo "🏗 Building project..."
npm run build

echo "♻ Reloading PM2 (zero downtime)..."
pm2 reload ecosystem.config.cjs

echo "✅ Deployment finished successfully!"