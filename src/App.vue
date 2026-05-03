<script setup lang="ts">
import { computed, watch } from 'vue'
import { PiniaColadaDevtools } from '@pinia/colada-devtools'
import { useMasterPreferencesStore } from '@entities/master'
import { useSessionStore } from '@entities/session'

const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
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
</script>

<template>
  <UApp>
    <RouterView />
  </UApp>

  <PiniaColadaDevtools />
</template>
