import type { TimeBlock } from '@entities/time-block/@x/appointment'
import type { Interval } from '@shared/lib/scheduling'
import type { Appointment, AppointmentStatus } from './types'
import { getCalendarDateTimeString } from '@shared/lib/time-zone'

const MINUTES_IN_DAY = 24 * 60

/** Statuses that free up the slot again — excluded from busy intervals. */
const EXCLUDED_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  'cancelled',
  'no_show',
  'expired',
])

interface DayTime {
  /** Calendar date in the master's timezone, `YYYY-MM-DD`. */
  date: string
  /** Minutes since local midnight (0–1440). */
  minutes: number
}

/** Splits a UTC ISO instant into `{ date, minutes }` in the master's timezone. */
function toDayTime(iso: string, timeZone: string): DayTime {
  const [date = '', time = '00:00:00'] = getCalendarDateTimeString(iso, timeZone).split('T')
  const [hours = '0', minutes = '0'] = time.split(':')
  return { date, minutes: Number(hours) * 60 + Number(minutes) }
}

/**
 * Projects an event `[startIso, endIso)` onto one calendar day (`targetDate` in
 * `timeZone`), returning the busy minutes-since-midnight interval clipped to
 * `[0, 1440]`, or `null` when the event does not touch that day. Handles events
 * crossing midnight and multi-day (all-day) blocks: any part before the day maps
 * to `0`, any part after to `1440`.
 */
function toDayInterval(
  startIso: string,
  endIso: string,
  targetDate: string,
  timeZone: string,
): Interval | null {
  const start = toDayTime(startIso, timeZone)
  const end = toDayTime(endIso, timeZone)

  if (start.date > targetDate || end.date < targetDate) return null

  const startMinutes = start.date < targetDate ? 0 : start.minutes
  const endMinutes = end.date > targetDate ? MINUTES_IN_DAY : end.minutes

  if (endMinutes <= startMinutes) return null
  return [startMinutes, endMinutes]
}

/**
 * An appointment → busy interval for `targetDate`. Returns `null` for
 * cancelled / no-show / expired appointments (they no longer block the slot) or
 * when the appointment does not overlap the day. The end is derived from
 * `start_at + duration` since appointments store no end column.
 */
export function appointmentToBusyInterval(
  appointment: Appointment,
  targetDate: string,
  timeZone: string,
): Interval | null {
  if (EXCLUDED_STATUSES.has(appointment.status)) return null

  const endIso = new Date(
    new Date(appointment.start_at).getTime() + appointment.duration * 60_000,
  ).toISOString()

  return toDayInterval(appointment.start_at, endIso, targetDate, timeZone)
}

/**
 * A time off (`time_block`) → busy interval for `targetDate`. All-day and
 * multi-day blocks are stored as a `start_at`/`end_at` span (all-day = local
 * `00:00` → next local `00:00`), so the generic day-projection already yields a
 * full `[0, 1440]` on every fully-covered day — no special-casing needed.
 */
export function timeBlockToBusyInterval(
  block: TimeBlock,
  targetDate: string,
  timeZone: string,
): Interval | null {
  return toDayInterval(block.start_at, block.end_at, targetDate, timeZone)
}

export interface CollectBusyIntervalsInput {
  appointments?: Appointment[]
  timeBlocks?: TimeBlock[]
  /** Target calendar day, `YYYY-MM-DD` in the master's timezone. */
  date: string
  timeZone: string
}

/**
 * All busy intervals for one day: appointments (minus freed statuses) + time
 * offs, each mapped to minutes-since-midnight. Feed the result — together with
 * schedule breaks from {@link resolveDayWindow} — into the pure scheduling core
 * (`findAvailableSlots` / `findFreeIntervals`).
 */
export function collectDayBusyIntervals(input: CollectBusyIntervalsInput): Interval[] {
  const intervals: Interval[] = []

  for (const appointment of input.appointments ?? []) {
    const interval = appointmentToBusyInterval(appointment, input.date, input.timeZone)
    if (interval) intervals.push(interval)
  }

  for (const block of input.timeBlocks ?? []) {
    const interval = timeBlockToBusyInterval(block, input.date, input.timeZone)
    if (interval) intervals.push(interval)
  }

  return intervals
}
