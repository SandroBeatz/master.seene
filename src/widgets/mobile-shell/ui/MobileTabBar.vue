<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { NavigationMenuItem } from '@nuxt/ui'

const emit = defineEmits<{ actions: [] }>()

const { t } = useI18n()

const items = computed<NavigationMenuItem[]>(() => [
  { label: t('nav.home'), icon: 'i-lucide-home', to: '/home' },
  { label: t('nav.calendar'), icon: 'i-lucide-calendar', to: '/calendar' },
  { label: t('nav.actions'), icon: 'i-lucide-plus', onSelect: () => emit('actions') },
  { label: t('nav.analytics'), icon: 'i-lucide-chart-area', to: '/analytics' },
  { label: t('nav.settings'), icon: 'i-lucide-settings', to: '/settings' },
])

const tabBarUI = {
  root: 'justify-around border-t border-default bg-default py-2',
  item: 'py-0',
  link: 'flex-col gap-1 px-3 text-dimmed aria-[current=page]:text-highlighted',
  linkLeadingIcon: 'size-5.5',
  linkLabel: 'text-[10px]/3 font-medium',
}
</script>

<template>
  <UNavigationMenu
    :items="items"
    :ui="tabBarUI"
    class="w-full shrink-0"
    style="padding-bottom: calc(env(safe-area-inset-bottom) + 0.5rem)"
  />
</template>
