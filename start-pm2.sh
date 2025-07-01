#!/bin/bash

# Bot Startup Script with PM2
echo "🚀 Starting Discord Bot with PM2..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Check if required files exist
if [ ! -f "bot.js" ]; then
    echo "❌ bot.js not found in current directory."
    exit 1
fi

if [ ! -f "config.json" ]; then
    echo "❌ config.json not found. Please create it first."
    exit 1
fi

# Check if DISCORD_TOKEN is set
if [ -z "$DISCORD_TOKEN" ]; then
    echo "⚠️ DISCORD_TOKEN environment variable not set."
    echo "Make sure to set it: export DISCORD_TOKEN='your_token_here'"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create logs directory
mkdir -p logs

# Stop existing instances
echo "🛑 Stopping existing instances..."
pm2 stop discord-bot 2>/dev/null || true
pm2 delete discord-bot 2>/dev/null || true

# Start the bot with PM2
echo "🔍 Starting bot with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup

echo "✅ Bot started with PM2!"
echo "📊 Use 'pm2 status' to check status"
echo "📋 Use 'pm2 logs discord-bot' to see logs"
echo "🛑 Use 'pm2 stop discord-bot' to stop"
echo "🔄 Use 'pm2 restart discord-bot' to restart" 