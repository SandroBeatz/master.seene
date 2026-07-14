import { hasAnyFreeSlot, type Interval } from '@shared/lib/scheduling'
import { resolveDayWindow } from './resolve-day-window'
import type { MasterSchedule } from './types'

/**
 * A calendar day's booking state, from the master's point of view:
 * - `day-off` — the master doesn't work that weekday (no working window);
 * - `available` — a working day with at least one free slot for the duration;
 * - `full` — a working day whose free time can't fit the selected services.
 */
export type DayState = 'available' | 'day-off' | 'full'

export interface ClassifyDayStateInput {
  schedule: MasterSchedule | null | undefined
  /** Calendar date `YYYY-MM-DD` in the master's timezone. */
  date: string
  /** Busy intervals for the day (appointments + time offs), minutes since midnight. */
  busy: Interval[]
  /** Slot grid granularity, minutes. */
  stepMinutes: number
  /** Total duration a slot must fit (sum of service durations), minutes. */
  durationMinutes: number
  /**
   * "Now" in minutes since midnight — pass **only when `date` is today** so past
   * times are excluded. Omit for any other day.
   */
  nowMinutes?: number
}

/**
 * Classifies a day for the appointment calendar so the UI can mark days-off and
 * fully-booked days instead of disabling them. Consistent with
 * {@link hasAnyFreeSlot}: a working day is `available` iff a slot would be found.
 */
export function classifyDayState(input: ClassifyDayStateInput): DayState {
  const { schedule, date, busy, stepMinutes, durationMinutes, nowMinutes } = input

  const window = resolveDayWindow(schedule, date)
  if (!window.enabled) return 'day-off'

  const earliest = nowMinutes == null ? window.workStart : Math.max(window.workStart, nowMinutes)
  const available = hasAnyFreeSlot({
    workStart: window.workStart,
    workEnd: window.workEnd,
    breaks: window.breaks,
    busy,
    stepMinutes,
    durationMinutes,
    earliest,
  })

  return available ? 'available' : 'full'
}
