// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],

  typescript: {
    strict: true,
    typeCheck: false
  },

  runtimeConfig: {
    sessionSecret: process.env.SESSION_SECRET || 'fallback_session_secret_32_characters_minimum_change_me',
    sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '604800', 10),
    superAdminName: process.env.SUPER_ADMIN_NAME || 'System Administrator',
    superAdminEmail: process.env.SUPER_ADMIN_EMAIL || 'admin@example.com',
    superAdminPassword: process.env.SUPER_ADMIN_PASSWORD || '',

    public: {
      appName: process.env.APP_NAME || 'Atlas Bites Facturation',
      appUrl: process.env.APP_URL || 'http://localhost:3000'
    }
  },

  nitro: {
    experimental: {
      tasks: true
    }
  },

  app: {
    head: {
      title: 'Atlas Bites Facturation',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Internal Invoicing CRM for Atlas Bites SARL' }
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  }
})
