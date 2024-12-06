import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
export default defineNuxtConfig({
  ssr: false,
  build: {
    transpile: ['vuetify']
  },
  modules: [
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', config => {
        // @ts-expect-error
        config.plugins.push(vuetify({ autoImport: true }))
      })
    }
    //...
  ],
  vite: {
    vue: {
      template: {
        transformAssetUrls
      }
    }
  },
  css: ['@mdi/font/css/materialdesignicons.min.css']
})
