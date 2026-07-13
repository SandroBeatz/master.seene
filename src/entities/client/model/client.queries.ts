import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { Ref } from 'vue'
import { createClient, listClients, removeClient, updateClient } from '../api/clients.api'
import type { CreateClientDto, UpdateClientDto } from './types'

export const useClientsQuery = (userId: Ref<string>) =>
  useQuery({
    key: () => ['clients', userId.value],
    query: () => listClients(userId.value),
  })

export const useCreateClientMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (dto: CreateClientDto) => createClient(userId.value, dto),
    onSettled: () => cache.invalidateQueries({ key: ['clients', userId.value] }),
  })
}

export const useUpdateClientMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (dto: UpdateClientDto) => updateClient(dto),
    onSettled: () => cache.invalidateQueries({ key: ['clients', userId.value] }),
  })
}

export const useRemoveClientMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (id: string) => removeClient(id),
    onSettled: () => cache.invalidateQueries({ key: ['clients', userId.value] }),
  })
}

export const useToggleFavoriteClientMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (vars: { id: string; is_favorite: boolean }) =>
      updateClient({ id: vars.id, is_favorite: vars.is_favorite }),
    onSettled: () => cache.invalidateQueries({ key: ['clients', userId.value] }),
  })
}
