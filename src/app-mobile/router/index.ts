import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'

// Standalone mobile route tree. Kept separate from the desktop router
// (src/app/router) on purpose — the mobile UX diverges, and this router uses
// `@ionic/vue-router` so `ion-router-outlet` can drive native transitions.
//
// Shared auth guards will be lifted into `shared/lib` and reused here once the
// real screens land; for now this is just enough to mount the shell.
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@app-mobile/ui/StarterPage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
