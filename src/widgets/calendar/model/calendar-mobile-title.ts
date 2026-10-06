import { addDateInputDays, getDateTimeInputValue } from '@shared/lib/time-zone'
import type { CalendarDateRange } from './calendar-controls'

export interface MobileCalendarTitle {
  /** Large header line — the month (month/week) or the date (day). */
  title: string
  /** Small line above it — the year, the week span or the weekday. */
  caption: string
}

/**
 * Header copy for the mobile calendar, in the master's zone:
 * month → «Октябрь» / «2026»; week → «Октябрь» / «29 сент. – 5 окт. 2026»
 * (two months → «Сент. – окт.»); day → «5 октября» / «Понедельник, 2026».
 */
export function formatMobileCalendarTitle(
  range: CalendarDateRange | undefined,
  locale: string,
  timeZone: string,
): MobileCalendarTitle {
  if (!range) return { title: '', caption: '' }

  const start = getDateTimeInputValue(range.currentFrom, timeZone).date
  const end = addDateInputDays(getDateTimeInputValue(range.currentTo, timeZone).date, -1)
  if (!start || !end) return { title: range.title, caption: '' }

  const format = (date: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(toNoonUtc(date))

  if (range.viewType === 'timeGridDay') {
    return {
      title: format(start, { day: 'numeric', month: 'long' }),
      caption: capitalize(`${format(start, { weekday: 'long' })}, ${start.slice(0, 4)}`),
    }
  }

  const sameMonth = start.slice(0, 7) === end.slice(0, 7)
  const title =
    range.viewType === 'dayGridMonth' || sameMonth
      ? format(start, { month: 'long' })
      : `${format(start, { month: 'short' })} – ${format(end, { month: 'short' })}`

  if (range.viewType === 'dayGridMonth') {
    return { title: capitalize(title), caption: start.slice(0, 4) }
  }

  return {
    title: capitalize(title),
    caption: formatRange(start, end, locale),
  }
}

/** Whether today (in the master's zone) lies inside the visible period. */
export function isCurrentCalendarPeriod(
  range: CalendarDateRange | undefined,
  timeZone: string,
  now: Date = new Date(),
): boolean {
  if (!range) return true
  const today = getDateTimeInputValue(now, timeZone).date
  const start = getDateTimeInputValue(range.currentFrom, timeZone).date
  const endExclusive = getDateTimeInputValue(range.currentTo, timeZone).date
  return today >= start && today < endExclusive
}

function formatRange(start: string, end: string, locale: string): string {
  // `formatRange` is missing from the TS lib targeted here; old WebViews too.
  const formatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }) as Intl.DateTimeFormat & { formatRange?: (from: Date, to: Date) => string }

  return formatter.formatRange
    ? formatter.formatRange(toNoonUtc(start), toNoonUtc(end))
    : `${formatter.format(toNoonUtc(start))} – ${formatter.format(toNoonUtc(end))}`
}

function toNoonUtc(date: string): Date {
  return new Date(`${date}T12:00:00Z`)
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1)
}
