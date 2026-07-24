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
    class:
      'before:block before:bg-primary dark:before:bg-white [&_[data-slot=linkLeadingIcon]]:text-inverted! dark:[&_[data-slot=linkLeadingIcon]]:text-zinc-950!',
    onSelect: () => {
      tap()
      emit('actions')
    },
  },
  { icon: 'i-lucide-chart-area', to: '/analytics', onSelect: tap },
  { icon: 'i-lucide-settings', to: '/settings', onSelect: tap },
])

const tabBarUI = {
  root: 'mobile-tab-bar sticky inset-x-0 mx-4 flex-col items-stretch rounded-2xl bg-default/80 backdrop-blur-lg px-4 py-2 shadow-xl shadow-black/10 dark:shadow-black/30',
  list: 'flex items-center justify-between gap-2',
  link: 'before:hidden',
  linkLeadingIcon: 'size-5.5 dark:group-data-[active]:text-highlighted!',
}
</script>

<template>
  <UNavigationMenu
    :items="items"
    :ui="tabBarUI"
    style="bottom: calc(env(safe-area-inset-bottom) + 0.75rem)"
  />
</template>
