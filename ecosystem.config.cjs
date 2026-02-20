// ecosystem.config.cjs - Configuração PM2
module.exports = {
  apps: [
    {
      name: "ecuro-mcp-server",
      script: "./dist/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "production",
        TRANSPORT: "http",
        PORT: 3000,
      },
      // Logs
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      // Restart policy
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 5000,
    },
  ],
};
