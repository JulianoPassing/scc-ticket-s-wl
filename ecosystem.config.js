module.exports = {
  apps: [{
    name: 'discord-bot',
    script: 'bot.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      DISCORD_TOKEN: process.env.DISCORD_TOKEN
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    // Monitoramento de CPU
    max_cpu_percent: 80,
    // Configurações de performance
    node_args: '--max-old-space-size=512',
    // Auto-restart se CPU ficar alto
    kill_timeout: 5000,
    listen_timeout: 3000,
    // Logs
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
}; 