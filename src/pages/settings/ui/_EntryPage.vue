<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Page } from '@shared/ui'

const { t } = useI18n()

const settingsNav = computed(() => [
  [
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
  ],
  [
    { label: t('settings.nav.notifications'), icon: 'i-lucide-bell', to: '/settings/notifications' },
    {
      label: t('settings.nav.systemRegion'),
      icon: 'i-lucide-globe',
      to: '/settings/system-region',
    },
    { label: t('settings.nav.account'), icon: 'i-lucide-user-cog', to: '/settings/account' },
  ],
])
</script>

<template>
  <Page router :title="t('settings.title')" :description="t('settings.description')">
    <template #sidebar>
      <UCard :ui="{ root: 'rounded-xl shadow-panel ring-0 divide-y-0', body: 'p-2 sm:p-3' }">
        <UNavigationMenu variant="pill" orientation="vertical" :items="settingsNav" />
      </UCard>
    </template>
  </Page>
</template>
