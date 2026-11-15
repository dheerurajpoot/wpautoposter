#!/usr/bin/env bash
# ==============================================================================
# WP Content Autopilot — AWS Ubuntu One-Click Production Deployment Script
# ==============================================================================
set -e

echo "🚀 Starting WP Content Autopilot deployment on AWS..."

# 1. Ensure required environment file exists
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "⚠️  No .env found. Creating .env from .env.example..."
        cp .env.example .env
        echo "❗ IMPORTANT: Please edit .env with your GEMINI_API_KEY / OPENAI_API_KEY and secrets before running in production!"
    else
        echo "❌ Error: .env file missing. Please create .env first."
        exit 1
    fi
fi

# 2. Ensure data directory exists for SQLite persistence
mkdir -p data prompts nginx certbot/conf certbot/www

# 3. Detect if Docker is available
if command -v docker &> /dev/null && docker compose version &> /dev/null; then
    echo "🐳 Docker & Docker Compose detected. Deploying via Docker..."
    docker compose down || true
    docker compose build
    docker compose up -d
    echo ""
    echo "✅ Successfully deployed via Docker Compose!"
    echo "   Backend:  http://localhost:3100"
    echo "   Frontend: http://localhost:3000"
    echo "   Nginx:    http://localhost (Port 80/443)"
    docker compose ps
    exit 0
fi

# 4. Fallback: Native Node.js & PM2 deployment
echo "⚙️ Docker not detected. Proceeding with native Node.js / PM2 deployment..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

echo "📦 Installing root backend dependencies..."
npm install

echo "🔨 Building backend TypeScript..."
npm run build

echo "📦 Installing frontend dependencies..."
npm --prefix frontend install

echo "🔨 Building frontend Next.js..."
npm --prefix frontend run build

# If PM2 is installed, start or restart processes
if command -v pm2 &> /dev/null; then
    echo "🔄 Starting services with PM2..."
    pm2 startOrReload ecosystem.config.js
    pm2 save
    echo ""
    echo "✅ Deployed successfully with PM2!"
    pm2 status
else
    echo "⚠️  PM2 is not installed globally. To install PM2 and run as background services:"
    echo "   sudo npm install -g pm2"
    echo "   pm2 start ecosystem.config.js"
    echo "   pm2 startup && pm2 save"
fi

