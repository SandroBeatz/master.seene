import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { Ref } from 'vue'
import {
  createAppointment,
  listAppointments,
  removeAppointment,
  updateAppointment,
} from '../api/appointments.api'
import type { CreateAppointmentDto, UpdateAppointmentDto } from './types'

export interface AppointmentDateRange {
  from?: string
  to?: string
}

export const useAppointmentsQuery = (
  userId: Ref<string>,
  dateRange?: Ref<AppointmentDateRange>,
) =>
  useQuery({
    key: () => [
      'appointments',
      userId.value,
      dateRange?.value?.from ?? '',
      dateRange?.value?.to ?? '',
    ],
    query: () => listAppointments(userId.value, dateRange?.value),
  })

export const useCreateAppointmentMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (dto: CreateAppointmentDto) => createAppointment(userId.value, dto),
    onSettled: () => cache.invalidateQueries({ key: ['appointments', userId.value] }),
  })
}

export const useUpdateAppointmentMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (dto: UpdateAppointmentDto) => updateAppointment(dto),
    onSettled: () => cache.invalidateQueries({ key: ['appointments', userId.value] }),
  })
}

export const useRemoveAppointmentMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (id: string) => removeAppointment(id),
    onSettled: () => cache.invalidateQueries({ key: ['appointments', userId.value] }),
  })
}
