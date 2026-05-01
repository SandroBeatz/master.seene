import './app/styles/main.css'
import './app/styles/base.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { PiniaColada } from '@pinia/colada'
import ui from '@nuxt/ui/vue-plugin'
import VueTelInput from 'vue-tel-input'
import 'vue-tel-input/vue-tel-input.css'

import App from './App.vue'
import router from './app/router'
import { i18n } from '@shared/lib/i18n'
import { formatsPlugin } from '@shared/lib/formats'
import { useMasterPreferencesStore } from '@entities/master'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)
app.use(PiniaColada)
app.use(router)
app.use(ui)
app.use(i18n)
app.use(VueTelInput)
app.use(formatsPlugin, {
  getTimeFormat: () => useMasterPreferencesStore().timeFormat,
})

app.mount('#app')
