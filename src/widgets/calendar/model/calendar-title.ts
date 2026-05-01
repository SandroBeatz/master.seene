import type { CalendarDateRange } from './calendar-controls'

const DEFAULT_LOCALE = 'en'

export function formatCalendarRangeTitle(
  range: CalendarDateRange | undefined,
  locale: string,
): string {
  if (!range) return ''

  const normalizedLocale = locale || DEFAULT_LOCALE
  const start = new Date(range.currentFrom)
  const endExclusive = new Date(range.currentTo)

  if (!isValidDate(start) || !isValidDate(endExclusive)) return range.title

  if (range.viewType === 'dayGridMonth') {
    return formatMonthTitle(start, normalizedLocale)
  }

  const endInclusive = addDays(endExclusive, -1)

  if (range.viewType === 'timeGridDay' || isSameDay(start, endInclusive)) {
    return formatDate(start, normalizedLocale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return formatDateRange(start, endInclusive, normalizedLocale)
}

function formatMonthTitle(date: Date, locale: string): string {
  return formatDate(date, locale, { month: 'long', year: 'numeric' })
}

function formatDateRange(start: Date, end: Date, locale: string): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }) as Intl.DateTimeFormat & {
    formatRange?: (startDate: Date, endDate: Date) => string
  }

  if (typeof formatter.formatRange === 'function') {
    return formatter.formatRange(start, end)
  }

  return `${formatter.format(start)} – ${formatter.format(end)}`
}

function formatDate(date: Date, locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, options).format(date)
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime())
}
