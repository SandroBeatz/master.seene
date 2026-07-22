<script setup lang="ts">
import { computed } from 'vue'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import type { NavigationMenuItem } from '@nuxt/ui'

const emit = defineEmits<{ actions: [] }>()

// No-op on web (Capacitor's web implementation of Haptics is a safe stub).
function tap() {
  void Haptics.impact({ style: ImpactStyle.Light })
}

const items = computed<NavigationMenuItem[]>(() => [
  { icon: 'i-lucide-home', to: '/home', onSelect: tap },
  { icon: 'i-lucide-calendar', to: '/calendar', onSelect: tap },
  {
    icon: 'i-lucide-plus',
    class: 'before:block before:bg-primary [&_[data-slot=linkLeadingIcon]]:text-inverted!',
    onSelect: () => {
      tap()
      emit('actions')
    },
  },
  { icon: 'i-lucide-chart-area', to: '/analytics', onSelect: tap },
  { icon: 'i-lucide-settings', to: '/settings', onSelect: tap },
])

const tabBarUI = {
  root: 'fixed inset-x-0 z-40 mx-4 flex-col items-stretch rounded-2xl bg-default px-4 shadow-xl shadow-black/10 dark:shadow-black/30',
  list: 'flex items-center justify-between gap-2',
  link: 'before:hidden',
  linkLeadingIcon: 'size-5.5',
}
</script>

<template>
  <UNavigationMenu
    :items="items"
    :ui="tabBarUI"
    style="bottom: calc(env(safe-area-inset-bottom) + 0.75rem)"
  />
</template>
