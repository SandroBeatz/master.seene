import type { Interval } from '@shared/lib/scheduling'
import { DAY_ORDER, normalizeSchedule, toMinutes } from './master-schedule'
import type { MasterSchedule } from './types'

/** A day's working window resolved to minutes-since-midnight. */
export interface DayWindow {
  /** False when the weekday is a day off — no availability. */
  enabled: boolean
  workStart: number
  workEnd: number
  /** Schedule breaks as busy intervals. */
  breaks: Interval[]
}

const DISABLED_WINDOW: DayWindow = { enabled: false, workStart: 0, workEnd: 0, breaks: [] }

/** Monday-first weekday index for a `YYYY-MM-DD` calendar date. */
function weekdayIndex(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return -1
  const sundayFirst = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return (sundayFirst + 6) % 7
}

/**
 * Resolves the master's working window for the weekday of `date` (a calendar
 * date in the master's timezone) into minute integers the scheduling core
 * consumes. A day off — or an unparseable date — yields a disabled window.
 */
export function resolveDayWindow(
  schedule: MasterSchedule | null | undefined,
  date: string,
): DayWindow {
  const key = DAY_ORDER[weekdayIndex(date)]
  if (!key) return DISABLED_WINDOW

  const day = normalizeSchedule(schedule).days[key]
  if (!day.enabled) return DISABLED_WINDOW

  return {
    enabled: true,
    workStart: toMinutes(day.start),
    workEnd: toMinutes(day.end),
    breaks: day.breaks.map((slot) => [toMinutes(slot.start), toMinutes(slot.end)] as Interval),
  }
}
