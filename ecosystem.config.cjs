/**
 * PM2 Ecosystem Config — KMP-ADNG Academy (academy.digitalcoop.id)
 *
 * Berdampingan dengan digitalcoop.id di VPS yang sama, tetapi proses, port,
 * folder, database, dan .env terpisah. Pola mengikuti garuda-superapp.
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 restart ecosystem.config.cjs --env production
 *   pm2 logs garuda-academy
 */
module.exports = {
  apps: [
    {
      name: "garuda-academy",
      script: "dist/server.mjs",
      cwd: "/var/www/garuda-academy",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        PORT: 5100, // port khusus Academy, BUKAN 5000 milik digitalcoop.id
        HOST: "127.0.0.1", // hanya diakses lewat nginx
      },
      error_file: "logs/academy-error.log",
      out_file: "logs/academy-out.log",
      merge_logs: true,
      max_memory_restart: process.env.PM2_MAX_MEMORY || "500M",
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
