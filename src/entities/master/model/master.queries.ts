import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { Ref } from 'vue'
import {
  getMasterPreferences,
  getMasterProfile,
  updateMasterBookingSettings,
  updateMasterContacts,
  updateMasterNotificationSettings,
  updateMasterProfile,
  updateMasterSchedule,
} from '../api/master.api'
import type {
  MasterBookingSettingsUpdate,
  MasterContactsUpdate,
  MasterNotificationSettingsUpdate,
  MasterProfileUpdate,
  MasterSchedule,
} from './types'

export const masterPreferencesQueryKey = (userId: string) =>
  ['master', 'preferences', userId] as const

export const masterProfileQueryKey = (userId: string) => ['master', 'profile', userId] as const

/**
 * Cached fetch of the full master profile (name, username, specializations, bio).
 * Backs the Profile settings form — keeps data in the colada cache so revisiting
 * the page is instant instead of refetching every mount.
 */
export const useMasterProfileQuery = (userId: Ref<string>) =>
  useQuery({
    key: () => masterProfileQueryKey(userId.value),
    enabled: () => Boolean(userId.value),
    query: () => getMasterProfile(userId.value),
    staleTime: 5 * 60_000,
  })

export const useMasterPreferencesQuery = (userId: Ref<string>) =>
  useQuery({
    key: () => masterPreferencesQueryKey(userId.value),
    enabled: () => Boolean(userId.value),
    query: () => getMasterPreferences(userId.value),
    // No `initialData`: the query starts `pending` so consumers can show a
    // loading skeleton via `isPending`, and the real settings always load on
    // mount (avoids the stale-placeholder bug where saved values never appeared).
    staleTime: 60_000,
    gcTime: false,
  })

export const useInvalidateMasterPreferences = (userId: Ref<string>) => {
  const cache = useQueryCache()

  return () => cache.invalidateQueries({ key: masterPreferencesQueryKey(userId.value) })
}

export const useUpdateMasterProfileMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()

  return useMutation({
    mutation: (payload: MasterProfileUpdate) => updateMasterProfile(userId.value, payload),
    onSuccess: (updated) => {
      // Seed the cache with the server response so no refetch is needed.
      cache.setQueryData(masterProfileQueryKey(userId.value), updated)
    },
    onSettled: () => {
      cache.invalidateQueries({ key: masterPreferencesQueryKey(userId.value) })
      cache.invalidateQueries({ key: masterProfileQueryKey(userId.value) })
    },
  })
}

export const useUpdateMasterContactsMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()

  return useMutation({
    mutation: (payload: MasterContactsUpdate) => updateMasterContacts(userId.value, payload),
    onSuccess: (updated) => {
      // Seed the cache with the server response so no refetch is needed.
      cache.setQueryData(masterProfileQueryKey(userId.value), updated)
    },
    onSettled: () => {
      cache.invalidateQueries({ key: masterPreferencesQueryKey(userId.value) })
      cache.invalidateQueries({ key: masterProfileQueryKey(userId.value) })
    },
  })
}

export const useUpdateMasterBookingSettingsMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()

  return useMutation({
    mutation: (payload: MasterBookingSettingsUpdate) =>
      updateMasterBookingSettings(userId.value, payload),
    onSettled: () => {
      cache.invalidateQueries({ key: masterPreferencesQueryKey(userId.value) })
    },
  })
}

export const useUpdateMasterNotificationSettingsMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()

  return useMutation({
    mutation: (payload: MasterNotificationSettingsUpdate) =>
      updateMasterNotificationSettings(userId.value, payload),
    onSettled: () => {
      cache.invalidateQueries({ key: masterPreferencesQueryKey(userId.value) })
    },
  })
}

export const useUpdateMasterScheduleMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()

  return useMutation({
    mutation: (schedule: MasterSchedule) => updateMasterSchedule(userId.value, schedule),
    onSuccess: (updated) => {
      // Seed the cache with the server response so no refetch is needed.
      cache.setQueryData(masterProfileQueryKey(userId.value), updated)
    },
    onSettled: () => {
      cache.invalidateQueries({ key: masterPreferencesQueryKey(userId.value) })
      cache.invalidateQueries({ key: masterProfileQueryKey(userId.value) })
    },
  })
}
