import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { Ref } from 'vue'
import { createMasterPreferences } from './master-preferences'
import { getMasterPreferences, updateMasterProfile } from '../api/master.api'
import type { MasterProfileUpdate } from './types'

export const masterPreferencesQueryKey = (userId: string) =>
  ['master', 'preferences', userId] as const

export const useMasterPreferencesQuery = (userId: Ref<string>) =>
  useQuery({
    key: () => masterPreferencesQueryKey(userId.value),
    enabled: () => Boolean(userId.value),
    query: () => getMasterPreferences(userId.value),
    initialData: () => createMasterPreferences(null, null),
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
    onSettled: () => cache.invalidateQueries({ key: masterPreferencesQueryKey(userId.value) }),
  })
}
