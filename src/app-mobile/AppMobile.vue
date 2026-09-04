<script setup lang="ts">
import { computed, watch } from 'vue'
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import { useMasterPreferencesStore } from '@entities/master'
import { useSessionStore } from '@entities/session'

const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
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
