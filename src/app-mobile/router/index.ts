import { createRouter, createWebHashHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useSessionStore } from '@entities/session'
import { supabase } from '@shared/lib/supabase'
import { resolveAuthDecision, type AuthArea } from '@shared/lib/auth'
import TabsPage from '../ui/TabsPage.vue'

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
    redirect: '/tabs/home',
  },
  {
    path: '/login',
    name: 'login',
    component: async () => (await import('@pages/login/index.mobile')).LoginMobilePage,
  },
  {
    path: '/register',
    name: 'register',
    component: async () => (await import('@pages/register/index.mobile')).RegisterMobilePage,
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: async () =>
      (await import('@pages/onboarding/index.mobile')).OnboardingPlaceholderMobilePage,
  },
  // The tab shell owns the five main destinations. Nesting them as children of
  // `/tabs` gives the persistent bottom tab bar under the top-level screens.
  {
    path: '/tabs/',
    component: TabsPage,
    children: [
      { path: '', redirect: '/tabs/home' },
      {
        path: 'home',
        name: 'home',
        component: async () => (await import('@pages/home/index.mobile')).HomeMobilePage,
      },
      {
        path: 'calendar',
        name: 'calendar',
        component: async () => (await import('@pages/calendar/index.mobile')).CalendarMobilePage,
      },
      {
        path: 'clients',
        name: 'clients',
        component: async () => (await import('@pages/clients/index.mobile')).ClientsMobilePage,
      },
      {
        path: 'analytics',
        name: 'analytics',
        component: async () => (await import('@pages/analytics/index.mobile')).AnalyticsMobilePage,
      },
      {
        path: 'settings',
        name: 'settings',
        component: async () => (await import('@pages/settings/index.mobile')).SettingsMobilePage,
      },
    ],
  },
  // Detail / sub-pages live OUTSIDE the tab shell so they push onto the root
  // outlet and cover the bottom tab bar (a tab bar is noise on a drill-down
  // screen). Their `ion-back-button` default-href points back into the owning
  // tab, so back-navigation still lands on the right tab stack.
  {
    path: '/clients/:id',
    name: 'client-detail',
    component: async () => (await import('@pages/clients/index.mobile')).ClientDetailMobilePage,
  },
  {
    path: '/settings/profile',
    name: 'settings-profile',
    component: async () => (await import('@pages/settings/index.mobile')).SettingsProfilePage,
  },
  {
    path: '/settings/contacts',
    name: 'settings-contacts',
    component: async () => (await import('@pages/settings/index.mobile')).SettingsContactsPage,
  },
  {
    path: '/settings/working-hours',
    name: 'settings-working-hours',
    component: async () =>
      (await import('@pages/settings/index.mobile')).SettingsWorkingHoursPage,
  },
  {
    path: '/settings/system-region',
    name: 'settings-system-region',
    component: async () => (await import('@pages/settings/index.mobile')).SettingsSystemRegionPage,
  },
  {
    path: '/settings/account',
    name: 'settings-account',
    component: async () => (await import('@pages/settings/index.mobile')).SettingsAccountPage,
  },
  {
    path: '/services',
    name: 'settings-services',
    component: async () => (await import('@pages/services/index.mobile')).ServicesMobilePage,
  },
  {
    path: '/settings/payment-types',
    name: 'settings-payment-types',
    component: async () => (await import('@pages/settings/index.mobile')).SettingsPaymentTypesPage,
  },
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})

// Map a target path to the semantic auth area the shared decision helper works
// in. The mobile router maps the areas back to its own concrete paths below.
function classifyArea(path: string): AuthArea {
  if (path === '/login' || path === '/register') return 'auth'
  if (path.startsWith('/onboarding')) return 'onboarding'
  return 'app'
}

// Hydrate the Supabase session before the first screen, then gate the
// navigation through the same decision helper the desktop router uses
// (`@shared/lib/auth`), mapping its semantic areas to mobile paths.
router.beforeEach(async (to) => {
  const sessionStore = useSessionStore()
  if (!sessionStore.isInitialized) {
    await sessionStore.init()
  } else {
    await sessionStore.waitForReady()
  }

  const { session, profile } = sessionStore
  const decision = resolveAuthDecision(
    {
      hasSession: !!session,
      hasProfile: !!profile,
      isDeactivated: !!profile?.deactivated_at,
    },
    classifyArea(to.path),
  )

  switch (decision.action) {
    case 'sign-out':
      await supabase.auth.signOut()
      return '/login'
    case 'redirect':
      return decision.to === 'auth'
        ? '/login'
        : decision.to === 'onboarding'
          ? '/onboarding'
          : '/tabs/home'
    case 'allow':
      return
  }
})

export default router
