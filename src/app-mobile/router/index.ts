import { createRouter, createWebHashHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useSessionStore } from '@entities/session'

// Standalone mobile route tree. Separate from the desktop router
// (src/app/router) on purpose — the mobile UX diverges, and this router uses
// `@ionic/vue-router` so `ion-router-outlet` can drive native transitions.
//
// Hash history: the mobile bundle is served as its own HTML entry (mobile.html
// in dev, index.html in the native build), so a hash keeps routing working
// regardless of the file path and avoids deep-link 404s inside the Capacitor
// WebView without any server rewrite config.
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/home',
    name: 'home',
    component: async () => (await import('@pages/home/index.mobile')).HomeMobilePage,
  },
  {
    path: '/clients',
    name: 'clients',
    component: async () => (await import('@pages/clients/index.mobile')).ClientsMobilePage,
  },
  {
    path: '/clients/:id',
    name: 'client-detail',
    component: async () => (await import('@pages/clients/index.mobile')).ClientDetailMobilePage,
  },
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})

// Hydrate the Supabase session before the first screen. In dev the mobile entry
// shares localStorage with the desktop app (same origin), so an existing web
// login carries over. No auth redirects yet — the PoC has no login screen; that
// (and lifting the shared decision helper into shared/lib) comes with the real
// auth flow.
router.beforeEach(async () => {
  const sessionStore = useSessionStore()
  if (!sessionStore.isInitialized) {
    await sessionStore.init()
  } else {
    await sessionStore.waitForReady()
  }
})

export default router
