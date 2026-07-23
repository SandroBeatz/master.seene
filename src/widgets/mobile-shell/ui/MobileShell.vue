<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSwipe } from '@vueuse/core'
import { useQuickCreate } from '@widgets/quick-create-action'
import MobileTabBar from './MobileTabBar.vue'
import MobileHeader from './MobileHeader.vue'
import { provideMobilePushTitle } from '../model/push-title'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const quickCreate = useQuickCreate()
const pushTitle = provideMobilePushTitle()

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

// Routes whose header title is supplied at runtime by the pushed page itself
// (e.g. a client's name) rather than a static i18n key.
const DYNAMIC_TITLE_ROUTE_NAMES = new Set(['settings-clients-detail'])

const headerTitle = computed(() => {
  if (typeof route.name === 'string' && DYNAMIC_TITLE_ROUTE_NAMES.has(route.name)) {
    return pushTitle.value
  }
  const key = typeof route.name === 'string' ? titleKeyByRouteName[route.name] : undefined
  return key ? t(key) : ''
})

// Edge swipe-back: a right-swipe starting within the left edge zone pops the
// current pushed screen, mirroring iOS's native back gesture. Root tab screens
// have nothing to pop back to, so the gesture is a no-op there.
const mainRef = ref<HTMLElement | null>(null)
const EDGE_ZONE_PX = 24
let swipeStartX = 0

useSwipe(mainRef, {
  threshold: 60,
  onSwipeStart(event) {
    swipeStartX = event.touches[0]?.clientX ?? 0
  },
  onSwipeEnd(_event, direction) {
    if (isRootScreen.value) return
    if (direction === 'right' && swipeStartX <= EDGE_ZONE_PX) {
      router.back()
    }
  },
})
</script>

<template>
  <div class="flex h-dvh flex-col bg-[var(--app-canvas)]">
    <MobileHeader v-if="!isRootScreen" :title="headerTitle" @back="router.back()" />

    <main
      ref="mainRef"
      class="min-h-0 flex-1 overflow-auto"
      :class="{ 'pb-[calc(env(safe-area-inset-bottom)_+_4rem)]': isRootScreen }"
    >
      <RouterView />
    </main>

    <MobileTabBar v-if="isRootScreen" @actions="quickCreate.openMenu()" />
  </div>
</template>
