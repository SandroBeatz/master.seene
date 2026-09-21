import type { Appointment } from '@entities/appointment'

export const HOME_ACTION_WAITING_THRESHOLD_MINUTES = 15

export interface HomeActionableAppointmentGroups {
  requests: Appointment[]
  needsDecision: Appointment[]
  toFinish: Appointment[]
  ordered: Appointment[]
}

export function appointmentEndTime(appointment: Appointment): number {
  return new Date(appointment.start_at).getTime() + appointment.duration * 60_000
}

export function hasAppointmentSlotEnded(appointment: Appointment, now: Date = new Date()): boolean {
  return appointmentEndTime(appointment) <= now.getTime()
}

const byStartAscending = (a: Appointment, b: Appointment) =>
  new Date(a.start_at).getTime() - new Date(b.start_at).getTime()

/**
 * Builds the single mobile action feed from the actionable query.
 *
 * Group order is intentional and independent from chronological order:
 * unanswered future requests first, then missed requests, then confirmed
 * appointments that are ready for checkout. Items inside each group are
 * chronological. The API already limits confirmed appointments to the
 * existing 14-day checkout window; this helper only classifies its result.
 */
export function groupHomeActionableAppointments(
  appointments: readonly Appointment[],
  now: Date = new Date(),
): HomeActionableAppointmentGroups {
  const requests: Appointment[] = []
  const needsDecision: Appointment[] = []
  const toFinish: Appointment[] = []

  for (const appointment of appointments) {
    const slotEnded = hasAppointmentSlotEnded(appointment, now)

    if (appointment.status === 'pending') {
      ;(slotEnded ? needsDecision : requests).push(appointment)
    } else if (appointment.status === 'confirmed' && slotEnded) {
      toFinish.push(appointment)
    }
  }

  requests.sort(byStartAscending)
  needsDecision.sort(byStartAscending)
  toFinish.sort(byStartAscending)

  return {
    requests,
    needsDecision,
    toFinish,
    ordered: [...requests, ...needsDecision, ...toFinish],
  }
}

export function minutesSince(isoString: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(isoString).getTime()) / 60_000))
}

export function needsHomeActionWaitingAttention(
  appointment: Appointment,
  now: Date = new Date(),
): boolean {
  return (
    appointment.status === 'pending' &&
    appointment.source === 'online_booking' &&
    !hasAppointmentSlotEnded(appointment, now) &&
    minutesSince(appointment.created_at, now) >= HOME_ACTION_WAITING_THRESHOLD_MINUTES
  )
}
