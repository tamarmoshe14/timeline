import { createVuetify } from 'vuetify'
import 'vuetify/styles' // Import Vuetify styles

export default defineNuxtPlugin(nuxtApp => {
  const vuetify = createVuetify({
    icons: {
      defaultSet: 'mdi' // Default icon set to Material Design Icons
    }
  })

  nuxtApp.vueApp.use(vuetify)
})
