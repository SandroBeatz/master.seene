import type { Appointment } from '@entities/appointment'
import type { MasterSchedule, MasterScheduleDayKey } from '@entities/master'
import type { TimeBlock } from '@entities/time-block'
import {
  addDateInputDays,
  getCalendarDateTimeString,
  getDateTimeInputValue,
  toUtcIsoFromZonedDateTime,
} from '@shared/lib/time-zone'

const DAY_KEYS: MasterScheduleDayKey[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

export interface TodayScheduleRange {
  /** Calendar date in the master's timezone. */
  date: string
  /** Inclusive UTC bounds used by the existing range queries. */
  from: string
  to: string
}

export interface ScheduleMinuteInterval {
  from: number
  to: number
}

/** Current master-timezone day as an inclusive UTC query range. */
export function createTodayScheduleRange(now: Date, timeZone: string): TodayScheduleRange {
  const date = getDateTimeInputValue(now, timeZone).date
  const nextDate = addDateInputDays(date, 1)
  const from = toUtcIsoFromZonedDateTime(date, '00:00', timeZone)
  const nextMidnight = toUtcIsoFromZonedDateTime(nextDate, '00:00', timeZone)

  return {
    date,
    from,
    // Both existing appointment/time-block APIs use inclusive upper bounds.
    to: new Date(new Date(nextMidnight).getTime() - 1).toISOString(),
  }
}

/** A stable Date used only for locale formatting of a YYYY-MM-DD calendar day. */
export function calendarDateForFormatting(date: string): Date {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12))
}

export function minutesFromTime(value: string): number {
  const [hours = 0, minutes = 0] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export function timeFromMinutes(value: number): string {
  const normalized = ((value % 1440) + 1440) % 1440
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(
    normalized % 60,
  ).padStart(2, '0')}`
}

/** Minutes from midnight for an instant in the master's timezone. */
export function minutesInTimeZone(value: string | Date, timeZone: string): number {
  return minutesFromTime(getCalendarDateTimeString(value, timeZone).slice(11, 16))
}

/** Working window for a calendar date, or null for a day off/missing schedule. */
export function workingHoursForDate(
  schedule: MasterSchedule | null | undefined,
  date: string,
): ScheduleMinuteInterval | null {
  if (!schedule?.days) return null

  const dayIndex = calendarDateForFormatting(date).getUTCDay()
  const key = DAY_KEYS[dayIndex]
  const day = key ? schedule.days[key] : null
  if (!day?.enabled || !day.start || !day.end) return null

  const start = minutesFromTime(day.start)
  const end = minutesFromTime(day.end)
  return end > start ? { from: start, to: end } : null
}

/** Appointment projected onto the current day and clamped to its boundaries. */
export function appointmentMinuteInterval(
  appointment: Appointment,
  date: string,
  timeZone: string,
): ScheduleMinuteInterval | null {
  const startWallClock = getCalendarDateTimeString(appointment.start_at, timeZone)
  const startDate = startWallClock.slice(0, 10)
  if (startDate !== date) return null

  const from = minutesFromTime(startWallClock.slice(11, 16))
  const to = Math.min(1440, from + appointment.duration)
  return to > from ? { from, to } : null
}

/** Time block projected onto a day, including blocks that cross midnight. */
export function timeBlockMinuteInterval(
  block: TimeBlock,
  date: string,
  timeZone: string,
): ScheduleMinuteInterval | null {
  const start = getCalendarDateTimeString(block.start_at, timeZone)
  const end = getCalendarDateTimeString(block.end_at, timeZone)
  const startDate = start.slice(0, 10)
  const endDate = end.slice(0, 10)

  if (startDate > date || endDate < date) return null

  const from = startDate < date ? 0 : minutesFromTime(start.slice(11, 16))
  const to = endDate > date ? 1440 : minutesFromTime(end.slice(11, 16))
  return to > from ? { from, to } : null
}
