<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, RouterView } from 'vue-router'
import type { NavigationMenuItem } from '@nuxt/ui'

const { t } = useI18n()
const route = useRoute()

// At the bare '/settings' path the leaf match is the 'settings' route itself —
// show the hub list. Any deeper match (e.g. 'settings-profile') means a child
// is active, so hand off to it via the outlet (push/back flow, no sidebar).
const hasActiveChild = computed(() => route.name !== 'settings')

const navUI = {
  list: 'gap-0.5',
  link: 'w-full rounded-lg px-3 py-2.5 text-sm font-medium text-muted before:rounded-lg hover:text-highlighted',
  linkLeadingIcon: 'size-4.5 text-dimmed',
}

const generalItems = computed<NavigationMenuItem[]>(() => [
  { label: t('settings.nav.profile'), icon: 'i-lucide-user', to: '/settings/profile' },
  { label: t('settings.nav.contacts'), icon: 'i-lucide-at-sign', to: '/settings/contacts' },
  {
    label: t('settings.nav.workingHours'),
    icon: 'i-lucide-clock',
    to: '/settings/working-hours',
  },
  { label: t('settings.nav.booking'), icon: 'i-lucide-calendar-check', to: '/settings/booking' },
  {
    label: t('settings.nav.paymentMethods'),
    icon: 'i-lucide-credit-card',
    to: '/settings/payment-types',
  },
  {
    label: t('settings.nav.serviceCategories'),
    icon: 'i-lucide-tags',
    to: '/settings/service-categories',
  },
])

const workspaceItems = computed<NavigationMenuItem[]>(() => [
  { label: t('settings.nav.services'), icon: 'i-lucide-grid-2x2-plus', to: '/settings/services' },
  { label: t('settings.nav.clients'), icon: 'i-lucide-users', to: '/settings/clients' },
])

const systemItems = computed<NavigationMenuItem[]>(() => [
  { label: t('settings.nav.notifications'), icon: 'i-lucide-bell', to: '/settings/notifications' },
  { label: t('settings.nav.systemRegion'), icon: 'i-lucide-globe', to: '/settings/system-region' },
  { label: t('settings.nav.account'), icon: 'i-lucide-user-cog', to: '/settings/account' },
  { label: t('settings.nav.about'), icon: 'i-lucide-info', to: '/settings/about' },
])

const groups = computed(() => [
  { label: t('settings.nav.groupGeneral'), items: generalItems.value },
  { label: t('settings.nav.groupWorkspace'), items: workspaceItems.value },
  { label: t('settings.nav.groupSystem'), items: systemItems.value },
])
</script>

<template>
  <!-- Settings sub-pages render a bare UCard and rely on an ambient page
  padding they'd normally get from the desktop Page/UContainer wrapper —
  supply it here since mobile skips that wrapper entirely. -->
  <div v-if="hasActiveChild" class="p-4">
    <RouterView />
  </div>
  <div v-else class="flex flex-col gap-6 px-4 py-4">
    <h1 class="text-xl font-semibold text-highlighted">{{ t('settings.title') }}</h1>

    <div v-for="group in groups" :key="group.label" class="flex flex-col gap-1">
      <p class="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-dimmed">
        {{ group.label }}
      </p>
      <UCard :ui="{ root: 'rounded-xl shadow-panel ring-0 divide-y-0', body: 'p-2' }">
        <UNavigationMenu orientation="vertical" variant="pill" :items="group.items" :ui="navUI" />
      </UCard>
    </div>
  </div>
</template>
