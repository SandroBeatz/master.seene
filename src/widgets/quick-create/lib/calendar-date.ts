import { CalendarDate, type DateValue } from '@internationalized/date'

/** `DateValue` (any calendar-aware date type) → `YYYY-MM-DD` input string. */
export function calendarDateToInput(date: DateValue): string {
  return [date.year, String(date.month).padStart(2, '0'), String(date.day).padStart(2, '0')].join(
    '-',
  )
}

/** `YYYY-MM-DD` → `CalendarDate`, or `null` when unparseable. */
export function inputToCalendarDate(value: string): CalendarDate | null {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new CalendarDate(year, month, day)
}

/** Minutes-since-midnight → `HH:mm`. */
export function minutesToTimeInput(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/** `HH:mm` → minutes since midnight. */
export function timeInputToMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':')
  return Number(hours) * 60 + Number(minutes)
}
