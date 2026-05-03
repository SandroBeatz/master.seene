import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { Ref } from 'vue'
import {
  createTimeBlock,
  listTimeBlocks,
  removeTimeBlock,
  updateTimeBlock,
} from '../api/time-blocks.api'
import type { CreateTimeBlockDto, UpdateTimeBlockDto } from './types'

export interface TimeBlockDateRange {
  from?: string
  to?: string
}

export const useTimeBlocksQuery = (userId: Ref<string>, dateRange?: Ref<TimeBlockDateRange>) =>
  useQuery({
    key: () => [
      'time-blocks',
      userId.value,
      dateRange?.value?.from ?? '',
      dateRange?.value?.to ?? '',
    ],
    query: () => listTimeBlocks(userId.value, dateRange?.value),
  })

export const useCreateTimeBlockMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (dto: CreateTimeBlockDto) => createTimeBlock(userId.value, dto),
    onSettled: () => cache.invalidateQueries({ key: ['time-blocks', userId.value] }),
  })
}

export const useUpdateTimeBlockMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (dto: UpdateTimeBlockDto) => updateTimeBlock(dto),
    onSettled: () => cache.invalidateQueries({ key: ['time-blocks', userId.value] }),
  })
}

export const useRemoveTimeBlockMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (id: string) => removeTimeBlock(id),
    onSettled: () => cache.invalidateQueries({ key: ['time-blocks', userId.value] }),
  })
}
