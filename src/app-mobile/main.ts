import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue'

/* Required Ionic core styles (documented order). */
import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'

/* Optional Ionic utility styles. */
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/float-elements.css'
import '@ionic/vue/css/text-alignment.css'
import '@ionic/vue/css/text-transformation.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'

/* Tailwind + safe-area vars. Imported last so light-DOM utilities win. */
import './styles/main.css'

import AppMobile from './AppMobile.vue'
import router from './router'
import { installCore } from '@shared/lib/app-core'

const app = createApp(AppMobile)

// Pinia (+ persistence), Colada and i18n — the exact same shared state/data
// layer the desktop root installs.
installCore(app)

// IonicVue must be registered before the router so the Ionic components the
// router outlet renders are available.
app.use(IonicVue)
app.use(router)

router.isReady().then(() => {
  app.mount('#app')
})
