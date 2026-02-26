📄 Narrateur-Dashboard — Production Infrastructure Context
🔷 Project Overview

Project Name: Narrateur-Dashboard
Architecture:

Node.js backend (Nuxt 4 Nitro server output)

Discord selfbot process

MongoDB database

Hosted on AWS EC2 VPS

Domain managed via Namecheap + Cloudflare

Reverse proxy via NGINX

Process manager: PM2

CI/CD via GitHub Actions

Zero-downtime deployment enabled

🖥 Server Infrastructure
VPS

Provider: AWS EC2

Instance type: t3.small

Specs:

2 vCPU

2GB RAM

OS: Ubuntu (Linux)

Node version: 20

MongoDB running locally

NGINX installed and configured

⚙️ Process Management (PM2)

PM2 is used to manage application processes.

Current Ecosystem Config

File: ecosystem.config.cjs

Contains:

backend

Runs in cluster mode

Uses all CPU cores (instances: "max")

Script: .output/server/index.mjs

Zero-downtime reload enabled via pm2 reload

bot

Runs in fork mode

Script: discord-bot/selfbot.js

Zero Downtime Strategy

Deployment uses:

pm2 reload ecosystem.config.cjs

Instead of:

pm2 restart

Reload:

Spins new process

Waits until ready

Kills old process

No user downtime

🔐 Security Setup
SSH

Password authentication disabled

Key-based authentication only

PermitRootLogin no

GitHub deploy key added to authorized_keys

Firewall

UFW enabled with:

Port 22 (SSH)

Port 80 (HTTP)

Port 443 (HTTPS)

Everything else blocked.

🔄 CI/CD Pipeline

GitHub Actions workflow:

File:

.github/workflows/deploy.yml
Trigger
on:
  push:
    branches:
      - main

Only pushes to main deploy to production.

Pipeline Flow
Job 1 — Build (CI)

Checkout repository

Setup Node 20

npm ci

npm run build

If build fails → deployment stops.

Job 2 — Deploy (CD)

Depends on build:

needs: build

Steps:

Setup SSH using private key stored in VPS_SSH_KEY

SSH into VPS

Run deploy.sh

🚀 Deployment Script

File: deploy.sh

Runs on VPS:

#!/bin/bash
set -e

cd /home/rachid/Projects/Narrateur-Dashboard

git pull origin main
npm ci --omit=dev
npm run build
pm2 reload ecosystem.config.cjs
📦 Dependency Strategy

package-lock.json is committed

Lockfile generated on Linux (VPS)

CI and VPS both use npm ci

Deterministic builds guaranteed

🌐 Domain Setup

Production domain:

loupgarou.online

DNS managed via Cloudflare.

🧠 Development Workflow

Current workflow:

Local development (Windows)
↓
git push main
↓
GitHub Actions build
↓
If success → SSH deploy
↓
PM2 reload (zero downtime)
🧱 What Is NOT Implemented Yet

No staging environment

No rollback strategy

No health-check validation

No branch protection rules (optional next step)

No monitoring system (Prometheus, etc.)

No blue-green deployment

No containerization (Docker not used)

📊 System State Summary

This system currently provides:

Automated CI validation

Automated CD deployment

Deterministic dependency management

Zero-downtime reload

Basic VPS security hardening

SSH key-only authentication

Firewall protection

Production-grade deployment discipline

⚠️ Important Constraints

VPS limited to 2GB RAM

Must avoid unnecessary parallel processes

Production stability prioritized over complexity

No staging environment currently

Lockfile must remain Linux-compatible

🧭 Future Improvement Directions

Possible next upgrades:

Add branch protection for main

Add staging environment

Add health-check validation before reload

Add automatic rollback on failed deployment

Add monitoring & alerting

Add performance optimization

Add horizontal scaling

🔥 Final Architecture Diagram
Local Dev (Windows)
        ↓
GitHub (main branch)
        ↓
GitHub Actions (Ubuntu runner)
        ↓
Build Validation (npm ci + build)
        ↓
SSH Deploy
        ↓
AWS VPS (Ubuntu)
        ↓
deploy.sh
        ↓
PM2 Reload (cluster mode)
        ↓
Production live