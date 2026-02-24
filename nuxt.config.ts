// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@pinia/nuxt', '@nuxt/icon'],

  css: ['~/assets/scss/main.scss'],

  features: {
    inlineStyles: true,
  },

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
  },

  app: {
    head: {
      title: 'Loup Garou — Narrateur Dashboard',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Cinematic Werewolf Game Control Dashboard' },
        { name: 'theme-color', content: '#1a0a2e' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600;1,700&family=Quicksand:wght@300;400;500;600;700&display=swap',
        },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
  },

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/loupgarou',
    narrateurKey: process.env.NARRATEUR_KEY || '',
    discordClientId: process.env.DISCORD_CLIENT_ID || '',
    discordClientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    discordRedirectUri: process.env.DISCORD_REDIRECT_URI || '',
    public: {
      appName: 'Loup Garou',
      wsUrl: process.env.WS_URL || '',
    },
  },

  nitro: {
    preset: 'node-server',
    externals: {
      // discord.js-selfbot-v13 + node-fetch can't be bundled by rollup
      external: ['discord.js-selfbot-v13', 'node-fetch'],
    },
  },

  typescript: {
    strict: true,
  },
})
