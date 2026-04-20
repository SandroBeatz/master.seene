import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      meta: { layout: 'auth' },
      component: async () => (await import('@pages/login')).LoginPage,
    },
    {
      path: '/',
      name: 'home',
      component: async () => (await import('@pages/home')).HomePage,
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: async () => (await import('@pages/calendar')).CalendarPage,
    },
    {
      path: '/clients',
      name: 'clients',
      component: async () => (await import('@pages/clients')).ClientsPage,
    },
    {
      path: '/services',
      name: 'services',
      component: async () => (await import('@pages/services')).ServicesPage,
    },
    {
      path: '/settings',
      name: 'settings',
      redirect: '/settings/general',
      component: async () => (await import('@pages/settings')).SettingsPage,
      children: [
        {
          path: 'general',
          name: 'settings-general',
          component: async () => (await import('@pages/settings')).SettingsGeneralPage,
        },
      ],
    },
  ],
})

export default router
