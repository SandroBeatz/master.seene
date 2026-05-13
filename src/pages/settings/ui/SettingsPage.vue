<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const settingsNav = computed(() => [
  {
    label: t('settings.nav.general'),
    icon: 'i-lucide-sliders-horizontal',
    to: '/settings/general',
  },
  {
    label: t('settings.nav.paymentTypes'),
    icon: 'i-lucide-credit-card',
    to: '/settings/payment-types',
  },
])
</script>

<template>
  <UTheme
    :ui="{
      page: {
        root: 'px-12 w-full max-w-7xl mx-auto',
      },
      pageHeader: {
        root: 'border-none',
      },
    }"
  >
    <UPage as="main">
      <UPageHeader :title="t('settings.title')" :description="t('settings.description')" />
      <UPageBody>
        <div class="grid grid-cols-8 gap-4">
          <div class="col-span-2">
            <UPageCard :ui="{ container: 'p-2 sm:p-4' }" variant="soft">
              <UNavigationMenu variant="pill" orientation="vertical" :items="settingsNav" />
            </UPageCard>
          </div>

          <div class="col-span-6">
            <UPageCard variant="soft">
              <router-view />
            </UPageCard>
          </div>
        </div>
      </UPageBody>
    </UPage>
  </UTheme>
</template>
