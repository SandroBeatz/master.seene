import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createMasterPreferences } from './master-preferences'
import type { MasterPreferences } from './types'

export const useMasterPreferencesStore = defineStore('master-preferences', () => {
  const preferences = ref<MasterPreferences>(createMasterPreferences(null, null))

  const timeFormat = computed(() => preferences.value.timeFormat)
  const timeZone = computed(() => preferences.value.timeZone)

  function setPreferences(next: MasterPreferences | null | undefined) {
    preferences.value = next ?? createMasterPreferences(null, null)
  }

  function reset() {
    preferences.value = createMasterPreferences(null, null)
  }

  return {
    preferences,
    timeFormat,
    timeZone,
    setPreferences,
    reset,
  }
})
