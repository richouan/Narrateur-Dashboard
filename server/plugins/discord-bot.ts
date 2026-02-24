/**
 * Nitro plugin — starts the Discord self-bot inside the server process.
 * This avoids needing a second Heroku dyno.
 *
 * The bot only starts if DISCORD_TOKEN is set.
 * All config comes from environment variables (same as before).
 */
/**
 * Nitro plugin — optionally starts the Discord self-bot inside the server process.
 * Set EMBED_BOT=true in .env to enable (used in production on Heroku single-dyno).
 * For local dev, run the bot separately: npm run dev:bot
 */
export default defineNitroPlugin((_nitro) => {
  if (process.env.EMBED_BOT !== 'true') return

  setTimeout(async () => {
    try {
      const { resolve } = await import('path')
      const { pathToFileURL } = await import('url')
      const botPath = resolve(process.cwd(), 'discord-bot', 'selfbot.js')
      const { startBot } = await import(/* @vite-ignore */ pathToFileURL(botPath).href)

      const port = process.env.PORT || '3000'
      const serverUrl = process.env.SERVER_URL || `http://localhost:${port}`

      startBot({ serverUrl })

      console.log('[Plugin] Discord bot started (embedded mode)')
    } catch (error: any) {
      console.warn('[Plugin] Discord bot failed to start:', error.message)
    }
  }, 3000)
})
