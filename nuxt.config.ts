// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],

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
      appName: process.env.APP_NAME || 'Atlas CRM',
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
      title: 'Atlas CRM',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Plateforme de gestion d’entreprise : CRM, Facturation et Ressources humaines' }
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      script: [
        {
          innerHTML: `(function(){try{var t=localStorage.getItem("atlas_theme")||(document.cookie.match(/atlas_theme=([^;]+)/)||[])[1]||"system";if(t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}}catch(e){}})();`,
          type: 'text/javascript'
        }
      ]
    }
  }
})
