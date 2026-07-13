<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import type { NavigationMenuItem } from '@nuxt/ui'
import { Page } from '@shared/ui'

const { t } = useI18n()
const route = useRoute()

const settingsNav = computed<NavigationMenuItem[]>(() => [
  { label: t('settings.nav.groupGeneral'), type: 'label' },
  { label: t('settings.nav.profile'), icon: 'i-lucide-user', to: '/settings/profile' },
  { label: t('settings.nav.contacts'), icon: 'i-lucide-at-sign', to: '/settings/contacts' },
  { label: t('settings.nav.workingHours'), icon: 'i-lucide-clock', to: '/settings/working-hours' },
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
  { label: t('settings.nav.groupSystem'), type: 'label' },
  { label: t('settings.nav.notifications'), icon: 'i-lucide-bell', to: '/settings/notifications' },
  { label: t('settings.nav.systemRegion'), icon: 'i-lucide-globe', to: '/settings/system-region' },
  { label: t('settings.nav.account'), icon: 'i-lucide-user-cog', to: '/settings/account' },
])

const navUI = {
  list: 'gap-0.5',
  label: 'px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-dimmed',
  link:
    'w-full rounded-lg px-3 py-2 text-sm font-medium text-muted before:rounded-lg ' +
    'hover:text-highlighted aria-[current=page]:text-inverted ' +
    'aria-[current=page]:before:bg-inverted',
  linkLeadingIcon: 'size-4.5 text-dimmed group-aria-[current=page]:text-inverted',
  linkTrailing: 'ms-auto',
}
</script>

<template>
  <Page router :title="t('settings.title')" :description="t('settings.description')">
    <template #sidebar>
      <UCard :ui="{ root: 'rounded-xl shadow-panel ring-0 divide-y-0', body: 'p-2 sm:p-3' }">
        <UNavigationMenu variant="pill" orientation="vertical" :items="settingsNav" :ui="navUI">
          <template #item-trailing="{ item }">
            <span v-if="item.to && route.path === item.to" class="flex items-center gap-2">
              <span class="size-1.5 rounded-full bg-amber-400" />
            </span>
          </template>
        </UNavigationMenu>
      </UCard>
    </template>
  </Page>
</template>
