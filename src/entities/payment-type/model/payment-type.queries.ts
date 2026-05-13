import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { Ref } from 'vue'
import {
  createPaymentType,
  deletePaymentType,
  listPaymentTypes,
  updatePaymentType,
} from '../api/payment-type.api'
import type { CreatePaymentTypeDto, UpdatePaymentTypeDto } from './types'

export const usePaymentTypesQuery = (userId: Ref<string>) =>
  useQuery({
    key: () => ['payment-types', userId.value],
    query: () => listPaymentTypes(userId.value),
  })

export const useCreatePaymentTypeMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (dto: CreatePaymentTypeDto) => createPaymentType(userId.value, dto),
    onSettled: () => cache.invalidateQueries({ key: ['payment-types', userId.value] }),
  })
}

export const useUpdatePaymentTypeMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (dto: UpdatePaymentTypeDto) => updatePaymentType(dto),
    onSettled: () => cache.invalidateQueries({ key: ['payment-types', userId.value] }),
  })
}

export const useDeletePaymentTypeMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (id: string) => deletePaymentType(id),
    onSettled: () => cache.invalidateQueries({ key: ['payment-types', userId.value] }),
  })
}
