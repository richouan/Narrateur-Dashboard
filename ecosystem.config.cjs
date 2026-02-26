module.exports = {
  apps: [
    {
      name: "backend",
      cwd: "/home/rachid/Projects/Narrateur-Dashboard",
      script: ".output/server/index.mjs",
      exec_mode: "cluster",
      instances: "max",
      autorestart: true,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "bot",
      cwd: "/home/rachid/Projects/Narrateur-Dashboard",
      script: "discord-bot/selfbot.js",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
}
