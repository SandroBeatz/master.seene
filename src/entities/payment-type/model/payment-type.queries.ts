import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { Ref } from 'vue'
import {
  createPaymentType,
  deletePaymentType,
  listPaymentTypes,
  setPaymentTypeActive,
  updatePaymentType,
} from '../api/payment-type.api'
import type { CreatePaymentTypeDto, PaymentType, UpdatePaymentTypeDto } from './types'

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

/**
 * Toggles a payment method's active state with an optimistic cache update so the
 * switch flips instantly ("toggles apply right away"). Reverts on error.
 */
export const useSetPaymentTypeActiveMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: ({ id, is_active }: { id: string; is_active: boolean }) =>
      setPaymentTypeActive(id, is_active),
    onMutate: ({ id, is_active }) => {
      const key = ['payment-types', userId.value]
      const previous = cache.getQueryData<PaymentType[]>(key)
      if (previous) {
        cache.setQueryData(
          key,
          previous.map((pt) => (pt.id === id ? { ...pt, is_active } : pt)),
        )
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        cache.setQueryData(['payment-types', userId.value], context.previous)
      }
    },
    onSettled: () => cache.invalidateQueries({ key: ['payment-types', userId.value] }),
  })
}
