import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { Ref } from 'vue'
import { completeSale, getSaleByAppointmentId } from '../api/sale.api'
import type { CompleteSaleDto } from './types'

export const useSaleByAppointmentQuery = (appointmentId: Ref<string | undefined>) =>
  useQuery({
    key: () => ['sale-by-appointment', appointmentId.value ?? ''],
    query: () => {
      if (!appointmentId.value) return Promise.resolve(null)
      return getSaleByAppointmentId(appointmentId.value)
    },
  })

export const useCompleteSaleMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (dto: CompleteSaleDto) => completeSale(dto),
    onSettled: (_data, _error, dto) => {
      cache.invalidateQueries({ key: ['appointments', userId.value] })
      if (dto) {
        cache.invalidateQueries({ key: ['sale-by-appointment', dto.appointment_id] })
      }
    },
  })
}
