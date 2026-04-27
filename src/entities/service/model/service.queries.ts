import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { Ref } from 'vue'
import { createService, deleteService, listServices, updateService } from '../api/services.api'
import type { CreateServiceDto, UpdateServiceDto } from './types'

export const useServicesQuery = (userId: Ref<string>) =>
  useQuery({
    key: () => ['services', userId.value],
    query: () => listServices(userId.value),
  })

export const useCreateServiceMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (dto: CreateServiceDto) => createService(userId.value, dto),
    onSettled: () => cache.invalidateQueries({ key: ['services', userId.value] }),
  })
}

export const useUpdateServiceMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (dto: UpdateServiceDto) => updateService(dto),
    onSettled: () => cache.invalidateQueries({ key: ['services', userId.value] }),
  })
}

export const useDeleteServiceMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (id: string) => deleteService(id),
    onSettled: () => cache.invalidateQueries({ key: ['services', userId.value] }),
  })
}
