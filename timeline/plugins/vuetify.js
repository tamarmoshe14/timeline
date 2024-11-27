import { createVuetify } from 'vuetify'
import 'vuetify/styles' // Import Vuetify styles

export default defineNuxtPlugin(nuxtApp => {
  const vuetify = createVuetify()

  nuxtApp.vueApp.use(vuetify)
})
