import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { Ref } from 'vue'
import { completeSale, getSaleByAppointmentId, updateSale } from '../api/sale.api'
import type { CompleteSaleDto } from './types'

export const useSaleByAppointmentQuery = (appointmentId: Ref<string | undefined>) =>
  useQuery({
    key: () => ['sale-by-appointment', appointmentId.value ?? ''],
    enabled: () => !!appointmentId.value,
    query: () => getSaleByAppointmentId(appointmentId.value!),
  })

export const useUpdateSaleMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (vars: {
      id: string
      appointmentId: string
      patch: { payment_type_id?: string; amount?: number }
    }) => updateSale(vars.id, vars.patch),
    onSettled: (_data, _error, vars) =>
      Promise.all([
        cache.invalidateQueries({ key: ['sale-by-appointment', vars?.appointmentId ?? ''] }),
        cache.invalidateQueries({ key: ['appointments', userId.value] }),
      ]),
  })
}

export const useCompleteSaleMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (dto: CompleteSaleDto) => completeSale(dto),
    onSettled: (_data, _error, dto) => {
      const invalidations = [
        cache.invalidateQueries({ key: ['appointments', userId.value] }),
        cache.invalidateQueries({ key: ['appointments-actionable', userId.value] }),
        cache.invalidateQueries({ key: ['appointment-day-counts', userId.value] }),
      ]

      if (dto) {
        invalidations.push(
          cache.invalidateQueries({ key: ['sale-by-appointment', dto.appointment_id] }),
        )
      }

      return Promise.all(invalidations)
    },
  })
}
