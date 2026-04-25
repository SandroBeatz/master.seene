import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@shared/lib/supabase'

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
      path: '/register',
      name: 'register',
      meta: { layout: 'auth' },
      component: async () => (await import('@pages/register')).RegisterPage,
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: async () => (await import('@widgets/onboarding-layout')).OnboardingLayout,
      children: [
        {
          path: '',
          name: 'onboarding-step1',
          component: async () => (await import('@pages/onboarding')).OnboardingStep1Page,
        },
      ],
    },
    {
      path: '/',
      name: 'dashboard',
      redirect: '/home',
      component: async () => (await import('@widgets/dashboard-layout')).DashboardLayout,
      children: [
        {
          path: 'home',
          name: 'home',
          component: async () => (await import('@pages/home')).HomePage,
        },
        {
          path: 'calendar',
          name: 'calendar',
          component: async () => (await import('@pages/calendar')).CalendarPage,
        },
        {
          path: 'clients',
          name: 'clients',
          component: async () => (await import('@pages/clients')).ClientsPage,
        },
        {
          path: 'services',
          name: 'services',
          component: async () => (await import('@pages/services')).ServicesPage,
        },
        {
          path: 'settings',
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
    },
  ],
})

const publicRoutes = ['/login', '/register']

router.beforeEach(async (to) => {
  const { data: { session } } = await supabase.auth.getSession()
  const isPublic = publicRoutes.includes(to.path)

  if (!session && !isPublic) return '/login'
  if (session && isPublic) return '/home'
})

export default router
