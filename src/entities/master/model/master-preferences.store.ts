import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createMasterPreferences } from './master-preferences'
import type { MasterPreferences } from './types'
import { getMasterPreferences } from '../api/master.api'

export const useMasterPreferencesStore = defineStore('master-preferences', () => {
  const preferences = ref<MasterPreferences>(createMasterPreferences(null, null))
  const isLoading = ref(false)
  const isReady = ref(false)
  const error = ref<Error | null>(null)
  const currentUserId = ref('')
  let loadVersion = 0

  const timeFormat = computed(() => preferences.value.timeFormat)
  const timeZone = computed(() => preferences.value.timeZone)

  function setPreferences(next: MasterPreferences | null | undefined) {
    preferences.value = next ?? createMasterPreferences(null, null)
    isReady.value = Boolean(next)
    error.value = null
  }

  async function loadPreferences(userId: string): Promise<void> {
    if (!userId) {
      reset()
      return
    }

    const version = ++loadVersion
    currentUserId.value = userId
    isLoading.value = true
    error.value = null

    try {
      const next = await getMasterPreferences(userId)
      if (version !== loadVersion || currentUserId.value !== userId) return

      preferences.value = next
      isReady.value = true
    } catch (loadError) {
      if (version !== loadVersion || currentUserId.value !== userId) return

      error.value = loadError instanceof Error ? loadError : new Error('Failed to load preferences')
      isReady.value = false
    } finally {
      if (version === loadVersion && currentUserId.value === userId) {
        isLoading.value = false
      }
    }
  }

  function reset() {
    loadVersion++
    currentUserId.value = ''
    preferences.value = createMasterPreferences(null, null)
    isLoading.value = false
    isReady.value = false
    error.value = null
  }

  return {
    preferences,
    isLoading,
    isReady,
    error,
    timeFormat,
    timeZone,
    loadPreferences,
    setPreferences,
    reset,
  }
})
