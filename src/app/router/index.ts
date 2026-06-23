import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@entities/session'
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
          redirect: '/onboarding/step1',
        },
        {
          path: 'step1',
          name: 'onboarding-step1',
          component: async () => (await import('@pages/onboarding')).OnboardingStep1Page,
        },
        {
          path: 'step2',
          name: 'onboarding-step2',
          component: async () => (await import('@pages/onboarding')).OnboardingStep2Page,
        },
        {
          path: 'step3',
          name: 'onboarding-step3',
          component: async () => (await import('@pages/onboarding')).OnboardingStep3Page,
        },
        {
          path: 'step4',
          name: 'onboarding-step4',
          component: async () => (await import('@pages/onboarding')).OnboardingStep4Page,
        },
        {
          path: 'step5',
          name: 'onboarding-step5',
          component: async () => (await import('@pages/onboarding')).OnboardingStep5Page,
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
          path: 'analytics',
          name: 'analytics',
          component: async () => (await import('@pages/analytics')).AnalyticsPage,
        },
        {
          path: 'settings',
          name: 'settings',
          redirect: '/settings/profile',
          component: async () => (await import('@pages/settings')).EntryPage,
          children: [
            {
              path: 'profile',
              name: 'settings-profile',
              component: async () => (await import('@pages/settings')).SettingsProfilePage,
            },
            {
              path: 'contacts',
              name: 'settings-contacts',
              component: async () => (await import('@pages/settings')).SettingsContactsPage,
            },
            {
              path: 'working-hours',
              name: 'settings-working-hours',
              component: async () => (await import('@pages/settings')).SettingsWorkingHoursPage,
            },
            {
              path: 'booking',
              name: 'settings-booking',
              component: async () => (await import('@pages/settings')).SettingsBookingPage,
            },
            {
              path: 'payment-types',
              name: 'settings-payment-types',
              component: async () => (await import('@pages/settings')).SettingsPaymentTypesPage,
            },
            {
              path: 'notifications',
              name: 'settings-notifications',
              component: async () => (await import('@pages/settings')).SettingsNotificationsPage,
            },
            {
              path: 'system-region',
              name: 'settings-system-region',
              component: async () => (await import('@pages/settings')).SettingsSystemRegionPage,
            },
            {
              path: 'account',
              name: 'settings-account',
              component: async () => (await import('@pages/settings')).SettingsAccountPage,
            },
          ],
        },
      ],
    },
  ],
})

const authRoutes = ['/login', '/register']

router.beforeEach(async (to) => {
  const sessionStore = useSessionStore()

  if (!sessionStore.isInitialized) {
    await sessionStore.init()
  } else {
    await sessionStore.waitForReady()
  }

  const { session, profile } = sessionStore
  const isAuthRoute = authRoutes.includes(to.path)
  const isOnboarding = to.path.startsWith('/onboarding')

  // Soft-deleted account: sign the user out and block access. Real ban + data
  // cleanup happens 30 days later via a scheduled Edge Function (master.seene-c5og).
  if (session && profile?.deactivated_at) {
    await supabase.auth.signOut()
    return { path: '/login', query: { deactivated: '1' } }
  }

  // Unauthenticated → login (only auth routes are accessible without session)
  if (!session && !isAuthRoute) return '/login'

  if (session) {
    // Auth routes: check if onboarding done to decide where to send
    if (isAuthRoute) return profile ? '/home' : '/onboarding/step1'

    // Dashboard routes: must have completed onboarding
    if (!isOnboarding && !profile) return '/onboarding/step1'
  }
})

export default router
