<script setup lang="ts">
import { computed, watch } from 'vue'
import { PiniaColadaDevtools } from '@pinia/colada-devtools'
import { useMasterPreferencesQuery, useMasterPreferencesStore } from '@entities/master'
import { useSessionStore } from '@entities/session'

const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: masterPreferences } = useMasterPreferencesQuery(userId)

watch(
  [userId, masterPreferences],
  ([currentUserId, preferences]) => {
    if (!currentUserId) {
      masterPreferencesStore.reset()
      return
    }

    masterPreferencesStore.setPreferences(preferences)
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
