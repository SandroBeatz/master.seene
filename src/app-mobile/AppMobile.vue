<script setup lang="ts">
import { computed, watch } from 'vue'
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { useMasterPreferencesStore } from '@entities/master'
import type { ThemePreference } from '@entities/master'
import { useSessionStore } from '@entities/session'
import { useLocaleStore } from '@shared/lib/locale'
import { useAppearanceStore, type ThemeMode } from '@shared/lib/appearance'

const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
const localeStore = useLocaleStore()
const appearance = useAppearanceStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

// Load the account's saved preferences (currency, date/time format, …) so
// useFormats() renders dates and prices from settings instead of the built-in
// defaults — mirrors the desktop App.vue. Reset on sign-out.
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

function toThemeMode(theme: ThemePreference): ThemeMode {
  return theme === 'auto' ? 'system' : theme
}

// Apply the account's saved language/theme as soon as preferences load, not only
// when the settings page is opened (cross-device sync). Until then localStorage
// drives both — picked up at boot, so there's no flash. Mirrors desktop App.vue.
watch(
  () => masterPreferencesStore.isReady,
  (ready) => {
    if (!ready) return
    if (localeStore.current !== masterPreferencesStore.language) {
      localeStore.setLocale(masterPreferencesStore.language)
    }
    const themeMode = toThemeMode(masterPreferencesStore.theme)
    if (appearance.theme !== themeMode) appearance.setTheme(themeMode)
  },
  { immediate: true },
)
</script>

<template>
  <!--
    Ionic shell for the native build. `ion-router-outlet` (not vue-router's
    `<RouterView>`) is what gives the native push/pop page transitions and
    the iOS swipe-to-go-back gesture.
  -->
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>
