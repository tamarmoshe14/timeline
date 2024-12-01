import { createVuetify } from 'vuetify'
import { VDateInput } from 'vuetify/labs/VDateInput'

import 'vuetify/styles' // Import Vuetify styles

export default defineNuxtPlugin(nuxtApp => {
  const vuetify = createVuetify({
    components: {
      VDateInput
    },
    icons: {
      defaultSet: 'mdi' // Default icon set to Material Design Icons
    }
  })

  nuxtApp.vueApp.use(vuetify)
})
