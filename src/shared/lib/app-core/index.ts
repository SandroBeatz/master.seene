import type { App } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { PiniaColada } from '@pinia/colada'
import { i18n } from '@shared/lib/i18n'

/**
 * Installs the framework-level plugins shared by every composition root
 * (desktop `main.ts` and mobile `app-mobile/main.ts`): Pinia (+ persistence),
 * Colada, and i18n. Keeping this in `shared/lib` — instead of one bootstrap
 * importing the other — is what lets both build targets reuse the same state
 * and data-fetching layer without drifting.
 *
 * Deliberately excludes anything that depends on a slice above `shared`
 * (e.g. the formats plugin needs `@entities/master`) or on a specific UI kit
 * (Nuxt UI's `ui` plugin, Ionic's `IonicVue`) — those stay in each root.
 */
export function installCore(app: App): void {
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)

  app.use(pinia)
  app.use(PiniaColada)
  app.use(i18n)
}
