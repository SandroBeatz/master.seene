import './app/styles/main.css'
import './app/styles/base.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import ui from '@nuxt/ui/vue-plugin'
import VueTelInput from 'vue-tel-input'
import 'vue-tel-input/vue-tel-input.css'

import App from './App.vue'
import router from './app/router'
import { i18n } from '@shared/lib/i18n'
import { formatsPlugin } from '@shared/lib/formats'

const app = createApp(App)

app.use(createPinia())
app.use(PiniaColada)
app.use(router)
app.use(ui)
app.use(i18n)
app.use(VueTelInput)
app.use(formatsPlugin)

app.mount('#app')
