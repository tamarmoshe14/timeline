// import 'vuetify/styles'
// export default defineNuxtConfig({
//   compatibilityDate: '2024-11-01',
//   devtools: { enabled: true },
//   css: ['vuetify/styles'], // Import Vuetify styles globally
//   build: {
//     transpile: ['vuetify']
//   },
//   plugins: [
//     '~/plugins/vuetify.js' // Add the plugin
//   ]
// })

import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
export default defineNuxtConfig({
  //...
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
