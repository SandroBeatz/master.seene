import { useQuery } from '@pinia/colada'
import type { Ref } from 'vue'
import { listServiceCategories } from '../api/service-categories.api'

export const useServiceCategoriesQuery = (userId: Ref<string>) =>
  useQuery({
    key: () => ['service-categories', userId.value],
    query: () => listServiceCategories(userId.value),
  })
