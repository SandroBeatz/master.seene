import type { Appointment } from '@entities/appointment'

const VISIBLE_SCHEDULE_STATUSES = new Set<Appointment['status']>([
  'pending',
  'confirmed',
  'completed',
])

export function isVisibleScheduleAppointment(appointment: Appointment): boolean {
  return VISIBLE_SCHEDULE_STATUSES.has(appointment.status)
}
