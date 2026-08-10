<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useColorMode } from '@vueuse/core'
import { PiniaColadaDevtools } from '@pinia/colada-devtools'
import { useMasterPreferencesStore } from '@entities/master'
import { useSessionStore } from '@entities/session'
import { useLocaleStore } from '@shared/lib/locale'
import { initNativeShell } from '@shared/lib/native'

const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
const localeStore = useLocaleStore()
const { store: themePreference } = useColorMode()
const userId = computed(() => sessionStore.session?.user.id ?? '')
const { toasts } = useToast()

const toastIconByColor: Record<string, string> = {
  primary: 'i-lucide-bell',
  secondary: 'i-lucide-sparkles',
  success: 'i-lucide-circle-check',
  info: 'i-lucide-info',
  warning: 'i-lucide-triangle-alert',
  error: 'i-lucide-circle-x',
  neutral: 'i-lucide-bell',
}

// Nuxt UI only renders the icon slot when a toast provides an icon. Keep the
// call sites concise while giving every semantic toast a consistent icon.
watch(
  toasts,
  (items) => {
    for (const toast of items) {
      const color = typeof toast.color === 'string' ? toast.color : 'primary'
      toast.icon ??= toastIconByColor[color] ?? toastIconByColor.primary
    }
  },
  { immediate: true, flush: 'sync' },
)

onMounted(() => {
  initNativeShell()
})

watch(
  userId,
  (currentUserId) => {
    if (!currentUserId) {
      masterPreferencesStore.reset()
      return
    }

    void masterPreferencesStore.loadPreferences(currentUserId)
  },
  { immediate: true },
)

// Apply the account's saved language/theme once preferences load (cross-device
// sync). Until then localStorage drives both — picked up at boot, so there's no
// flash. Only write when the value actually differs to avoid redundant updates.
// A guest (no session) keeps the localStorage values.
watch(
  () => masterPreferencesStore.isReady,
  (ready) => {
    if (!ready) return
    if (localeStore.current !== masterPreferencesStore.language) {
      localeStore.setLocale(masterPreferencesStore.language)
    }
    if (themePreference.value !== masterPreferencesStore.theme) {
      themePreference.value = masterPreferencesStore.theme
    }
  },
)
</script>

<template>
  <UApp :toaster="{ position: 'top-center', progress: false, expand: false }">
    <RouterView />
  </UApp>

  <PiniaColadaDevtools />
</template>
