import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { Ref } from 'vue'
import {
  countClientAppointments,
  createAppointment,
  getNextAppointment,
  listActionableAppointments,
  listAppointmentDayCounts,
  listAppointments,
  listClientAppointments,
  removeAppointment,
  updateAppointment,
} from '../api/appointments.api'
import type { CreateAppointmentDto, UpdateAppointmentDto } from './types'

export interface AppointmentDateRange {
  from?: string
  to?: string
}

export interface AppointmentDayCountsRange {
  from: string
  to: string
  timeZone: string
}

export const useAppointmentsQuery = (userId: Ref<string>, dateRange?: Ref<AppointmentDateRange>) =>
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
    onSettled: () => {
      cache.invalidateQueries({ key: ['appointments', userId.value] })
      cache.invalidateQueries({ key: ['appointments-actionable', userId.value] })
      cache.invalidateQueries({ key: ['appointment-day-counts', userId.value] })
    },
  })
}

export const useUpdateAppointmentMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (dto: UpdateAppointmentDto) => updateAppointment(dto),
    onSettled: () => {
      cache.invalidateQueries({ key: ['appointments', userId.value] })
      cache.invalidateQueries({ key: ['appointments-actionable', userId.value] })
      cache.invalidateQueries({ key: ['appointment-day-counts', userId.value] })
    },
  })
}

export const useRemoveAppointmentMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (id: string) => removeAppointment(id),
    onSettled: () => {
      cache.invalidateQueries({ key: ['appointments', userId.value] })
      cache.invalidateQueries({ key: ['appointments-actionable', userId.value] })
      cache.invalidateQueries({ key: ['appointment-day-counts', userId.value] })
    },
  })
}

export const useActionableAppointmentsQuery = (userId: Ref<string>) =>
  useQuery({
    key: () => ['appointments-actionable', userId.value],
    query: () => listActionableAppointments(userId.value),
  })

export const useNextAppointmentQuery = (userId: Ref<string>) =>
  useQuery({
    key: () => ['appointment-next', userId.value],
    query: () => getNextAppointment(userId.value),
  })

/**
 * Number of appointments belonging to a client. Disabled until a client id is
 * available. Consumers derive "new client" as `count <= 1`.
 */
export const useClientAppointmentsCountQuery = (clientId: Ref<string>) =>
  useQuery({
    key: () => ['appointments-client-count', clientId.value],
    query: () => countClientAppointments(clientId.value),
    enabled: () => Boolean(clientId.value),
  })

/**
 * All appointments for a client (any status, newest first). Disabled until a
 * client id is available. Used by the client preview and to derive last visit.
 */
export const useClientAppointmentsQuery = (clientId: Ref<string>) =>
  useQuery({
    key: () => ['appointments-client', clientId.value],
    query: () => listClientAppointments(clientId.value),
    enabled: () => Boolean(clientId.value),
  })

export const useAppointmentDayCountsQuery = (
  userId: Ref<string>,
  range: Ref<AppointmentDayCountsRange>,
) =>
  useQuery({
    key: () => [
      'appointment-day-counts',
      userId.value,
      range.value.from,
      range.value.to,
      range.value.timeZone,
    ],
    query: () => listAppointmentDayCounts(range.value.from, range.value.to, range.value.timeZone),
  })
