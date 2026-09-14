import 'vue-tel-input/vue-tel-input.css'
import './app/styles/main.css'
import './app/styles/base.css'

import { createApp } from 'vue'
import ui from '@nuxt/ui/vue-plugin'
import VueTelInput from 'vue-tel-input'

import App from './App.vue'
import router from './app/router'
import { installCore } from '@shared/lib/app-core'
import { i18n } from '@shared/lib/i18n'
import { formatsPlugin } from '@shared/lib/formats'
import { useMasterPreferencesStore } from '@entities/master'

const app = createApp(App)

// Pinia (+ persistence), Colada and i18n — shared with the mobile root.
installCore(app)

app.use(router)
app.use(ui)
app.use(VueTelInput)
app.use(formatsPlugin, {
  getTimeFormat: () => useMasterPreferencesStore().timeFormat,
  getCurrency: () => useMasterPreferencesStore().currency,
  getDateFormat: () => useMasterPreferencesStore().dateFormat,
  getLocale: () => i18n.global.locale.value,
})

app.mount('#app')
