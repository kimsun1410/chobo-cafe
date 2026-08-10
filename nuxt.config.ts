// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-08-10',
  css: ['~/assets/css/main.css'],

  // pg 모듈 번들링 에러(Rolldown import) 방지
  nitro: {
    externals: {
      external: ['pg']
    }
  },
  devtools: { enabled: true },
})
