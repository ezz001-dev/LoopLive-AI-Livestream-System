// PM2 Ecosystem Config — LoopLive AI Livestream System
// Run all services with: pm2 start ecosystem.config.js
// Stop all:             pm2 stop all
// Monitor:              pm2 monit
// Logs:                 pm2 logs

module.exports = {
  apps: [
    // 1. Next.js Frontend + API Gateway
    {
      name: "looplive-app",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "./",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Auto-restart if crashes
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      // Logs
      out_file: "./logs/app-out.log",
      error_file: "./logs/app-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },

    // 2. Socket.io Chat Server
    {
      name: "looplive-socket",
      script: "node_modules/.bin/tsx",
      args: "src/lib/socket-server.ts",
      cwd: "./",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      out_file: "./logs/socket-out.log",
      error_file: "./logs/socket-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },

    // 3. AI Worker (LLM — reads chat queue from Redis, generates AI replies)
    {
      name: "looplive-ai-worker",
      script: "node_modules/.bin/tsx",
      args: "src/lib/ai-worker.ts",
      cwd: "./",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      restart_delay: 5000,   // wait longer before restart to avoid API rate limits
      max_restarts: 10,
      out_file: "./logs/ai-worker-out.log",
      error_file: "./logs/ai-worker-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },

    // 4. TTS Worker (converts AI text reply → audio MP3)
    {
      name: "looplive-tts-worker",
      script: "node_modules/.bin/tsx",
      args: "src/lib/tts-worker.ts",
      cwd: "./",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      out_file: "./logs/tts-worker-out.log",
      error_file: "./logs/tts-worker-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },

    // 5. YouTube Chat Poller (reads YouTube Live chat via masterchat)
    {
      name: "looplive-yt-poller",
      script: "node_modules/.bin/tsx",
      args: "src/lib/youtube-chat-poller.ts",
      cwd: "./",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      out_file: "./logs/yt-poller-out.log",
      error_file: "./logs/yt-poller-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },

    // 6. Scheduler Worker (auto start/stop live streams based on schedule)
    {
      name: "looplive-scheduler",
      script: "node_modules/.bin/tsx",
      args: "src/lib/scheduler-worker.ts",
      cwd: "./",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      out_file: "./logs/scheduler-out.log",
      error_file: "./logs/scheduler-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
