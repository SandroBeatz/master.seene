import './app/styles/main.css'
import './app/styles/base.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import ui from '@nuxt/ui/vue-plugin'

import App from './App.vue'
import router from './app/router'

const app = createApp(App)

app.use(createPinia())
app.use(PiniaColada)
app.use(router)
app.use(ui)

app.mount('#app')
