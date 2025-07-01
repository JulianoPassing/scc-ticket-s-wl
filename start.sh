#!/bin/bash

# Bot Startup Script with CPU Monitoring
echo "🚀 Starting Discord Bot with CPU monitoring..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
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

# Start the bot with monitoring
echo "🔍 Starting bot with CPU monitoring..."
node monitor.js 2>&1 | tee logs/bot-$(date +%Y%m%d-%H%M%S).log 