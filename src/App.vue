<script setup lang="ts">
import { computed, watch } from 'vue'
import { useColorMode } from '@vueuse/core'
import { PiniaColadaDevtools } from '@pinia/colada-devtools'
import { useMasterPreferencesStore } from '@entities/master'
import { useSessionStore } from '@entities/session'
import { useLocaleStore } from '@shared/lib/locale'

const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
const localeStore = useLocaleStore()
const { store: themePreference } = useColorMode()
const userId = computed(() => sessionStore.session?.user.id ?? '')

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
