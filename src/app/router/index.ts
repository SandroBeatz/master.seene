import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@pages/home/ui/HomePage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: () => import('@pages/about/ui/AboutPage.vue'),
    },
    {
      path: '/clients',
      name: 'clients',
      component: () => import('@pages/about/ui/AboutPage.vue'),
    },
    {
      path: '/services',
      name: 'services',
      component: () => import('@pages/about/ui/AboutPage.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: async () => (await import('@pages/settings')).SettingsPage,
    },
  ],
})

export default router
