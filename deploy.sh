#!/bin/bash

echo "🚀 Starting deployment..."

cd /home/rachid/Projects/Narrateur-Dashboard || exit

echo "📥 Pulling latest code..."
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "🏗 Building project..."
npm run build

echo "♻ Reloading PM2..."
pm2 reload ecosystem.config.cjs

echo "✅ Deployment finished!"