import { useQuery, useQueryCache } from '@pinia/colada'
import type { Ref } from 'vue'
import { createMasterPreferences } from './master-preferences'
import { getMasterPreferences } from '../api/master.api'

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
