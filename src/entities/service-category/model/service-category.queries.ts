import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { Ref } from 'vue'
import {
  createServiceCategory,
  deleteServiceCategory,
  listServiceCategories,
  updateServiceCategory,
} from '../api/service-categories.api'
import type { CreateServiceCategoryDto, UpdateServiceCategoryDto } from './types'

export const useServiceCategoriesQuery = (userId: Ref<string>) =>
  useQuery({
    key: () => ['service-categories', userId.value],
    query: () => listServiceCategories(userId.value),
  })

export const useCreateServiceCategoryMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (dto: CreateServiceCategoryDto) => createServiceCategory(userId.value, dto),
    onSettled: () => cache.invalidateQueries({ key: ['service-categories', userId.value] }),
  })
}

export const useUpdateServiceCategoryMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (dto: UpdateServiceCategoryDto) => updateServiceCategory(dto),
    onSettled: () => cache.invalidateQueries({ key: ['service-categories', userId.value] }),
  })
}

export const useDeleteServiceCategoryMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (id: string) => deleteServiceCategory(id),
    onSettled: () => {
      // Deleting a category unassigns its services (FK ON DELETE SET NULL),
      // so refresh both category and service lists.
      cache.invalidateQueries({ key: ['service-categories', userId.value] })
      cache.invalidateQueries({ key: ['services', userId.value] })
    },
  })
}
