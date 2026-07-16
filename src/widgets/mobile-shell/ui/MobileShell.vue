<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuickCreate } from '@widgets/quick-create-action'
import MobileTabBar from './MobileTabBar.vue'
import MobileHeader from './MobileHeader.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const quickCreate = useQuickCreate()

// The 4 tab-bar roots. Anything else in the dashboard tree (settings sub-pages,
// and future nested screens) is a "pushed" screen: tab bar hides, back header
// shows instead — the standard native push/back pattern.
const ROOT_TAB_ROUTE_NAMES = new Set(['home', 'calendar', 'analytics', 'settings'])
const isRootScreen = computed(
  () => typeof route.name === 'string' && ROOT_TAB_ROUTE_NAMES.has(route.name),
)

const titleKeyByRouteName: Record<string, string> = {
  'settings-profile': 'settings.nav.profile',
  'settings-contacts': 'settings.nav.contacts',
  'settings-working-hours': 'settings.nav.workingHours',
  'settings-booking': 'settings.nav.booking',
  'settings-payment-types': 'settings.nav.paymentMethods',
  'settings-service-categories': 'settings.nav.serviceCategories',
  'settings-notifications': 'settings.nav.notifications',
  'settings-system-region': 'settings.nav.systemRegion',
  'settings-account': 'settings.nav.account',
  'settings-services': 'settings.nav.services',
  'settings-clients': 'settings.nav.clients',
  'settings-about': 'settings.nav.about',
}

const headerTitle = computed(() => {
  const key = typeof route.name === 'string' ? titleKeyByRouteName[route.name] : undefined
  return key ? t(key) : ''
})
</script>

<template>
  <div class="flex h-dvh flex-col bg-[var(--app-canvas)]">
    <MobileHeader v-if="!isRootScreen" :title="headerTitle" @back="router.back()" />

    <main class="min-h-0 flex-1 overflow-auto">
      <RouterView />
    </main>

    <MobileTabBar v-if="isRootScreen" @actions="quickCreate.openMenu()" />
  </div>
</template>
