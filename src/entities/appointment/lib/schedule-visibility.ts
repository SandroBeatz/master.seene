import type { Appointment } from '../model/types'

const SCHEDULE_VISIBLE_STATUSES = new Set<Appointment['status']>([
  'pending',
  'confirmed',
  'completed',
])

/**
 * Whether an appointment occupies time on a schedule. Cancelled and no-show
 * visits are history, not bookings, so timelines and calendars hide them.
 */
export function isScheduleVisibleAppointment(appointment: Appointment): boolean {
  return SCHEDULE_VISIBLE_STATUSES.has(appointment.status)
}
