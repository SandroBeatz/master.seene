import type { Appointment } from '../model/types'

/** Statuses that count as an actual visit having taken place. */
const VISITED_STATUSES = new Set(['completed', 'confirmed'])

/**
 * The start time of the client's most recent past visit, or `null` if none.
 *
 * A "visit" is an appointment whose end time (start + duration) is in the past
 * and whose status indicates it happened (completed/confirmed). Cancelled,
 * no-show, expired and still-pending appointments are ignored. The input list
 * does not need to be pre-sorted.
 */
export function lastVisitDate(
  appointments: readonly Appointment[],
  now: Date = new Date(),
): string | null {
  const nowMs = now.getTime()
  let latest: string | null = null
  let latestMs = -Infinity

  for (const appt of appointments) {
    if (!VISITED_STATUSES.has(appt.status)) continue
    const startMs = new Date(appt.start_at).getTime()
    const endMs = startMs + appt.duration * 60_000
    if (endMs > nowMs) continue // hasn't happened yet
    if (startMs > latestMs) {
      latestMs = startMs
      latest = appt.start_at
    }
  }

  return latest
}
