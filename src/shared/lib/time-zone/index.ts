const LOCAL_TIME_ZONE = 'local'

interface DateTimeParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

export interface DateTimeInputValue {
  date: string
  time: string
}

export function getDateTimeInputValue(
  value: string | Date,
  timeZone = LOCAL_TIME_ZONE,
): DateTimeInputValue {
  const date = value instanceof Date ? value : new Date(value)

  if (!isValidDate(date)) {
    return { date: '', time: '' }
  }

  const parts = getDateTimeParts(date, timeZone)

  return {
    date: formatDateInputValue(parts),
    time: formatTimeInputValue(parts),
  }
}

export function toUtcIsoFromZonedDateTime(
  date: string,
  time: string,
  timeZone = LOCAL_TIME_ZONE,
): string {
  const parts = parseDateTimeInput(date, time)

  if (!parts) return new Date(`${date}T${time}:00`).toISOString()

  return getUtcDateFromZonedParts(parts, timeZone).toISOString()
}

export function toUtcIsoFromCalendarDateString(
  value: string,
  timeZone = LOCAL_TIME_ZONE,
): string {
  const parts = parseCalendarDateString(value)

  if (!parts) return new Date(value).toISOString()

  return getUtcDateFromZonedParts(parts, timeZone).toISOString()
}

export function getCalendarDateTimeString(
  value: string | Date,
  timeZone = LOCAL_TIME_ZONE,
): string {
  const date = value instanceof Date ? value : new Date(value)

  if (!isValidDate(date)) {
    return typeof value === 'string' ? value : ''
  }

  const parts = getDateTimeParts(date, timeZone)

  return `${formatDateInputValue(parts)}T${formatTimeInputValue(parts)}:${String(
    parts.second,
  ).padStart(2, '0')}`
}

export function addDateInputDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)

  if (!year || !month || !day) return date

  const next = new Date(Date.UTC(year, month - 1, day + days))

  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, '0'),
    String(next.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

function getUtcDateFromZonedParts(parts: DateTimeParts, timeZone: string): Date {
  if (isLocalTimeZone(timeZone)) {
    return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  }

  const guessedUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  const offsetMs = getTimeZoneOffsetMs(new Date(guessedUtcMs), timeZone)
  let utcMs = guessedUtcMs - offsetMs

  const secondOffsetMs = getTimeZoneOffsetMs(new Date(utcMs), timeZone)
  if (secondOffsetMs !== offsetMs) {
    utcMs = guessedUtcMs - secondOffsetMs
  }

  return new Date(utcMs)
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getDateTimeParts(date, timeZone)
  const zonedMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )

  return zonedMs - date.getTime()
}

function getDateTimeParts(date: Date, timeZone: string): DateTimeParts {
  if (isLocalTimeZone(timeZone)) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
    }
  }

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      calendar: 'gregory',
      numberingSystem: 'latn',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date)

    return {
      year: Number(getPartValue(parts, 'year')),
      month: Number(getPartValue(parts, 'month')),
      day: Number(getPartValue(parts, 'day')),
      hour: Number(getPartValue(parts, 'hour')),
      minute: Number(getPartValue(parts, 'minute')),
      second: Number(getPartValue(parts, 'second')),
    }
  } catch {
    return getDateTimeParts(date, LOCAL_TIME_ZONE)
  }
}

function parseDateTimeInput(date: string, time: string): DateTimeParts | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time)

  if (!dateMatch || !timeMatch) return null

  return {
    year: Number(dateMatch[1]),
    month: Number(dateMatch[2]),
    day: Number(dateMatch[3]),
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2]),
    second: Number(timeMatch[3] ?? 0),
  }
}

function parseCalendarDateString(value: string): DateTimeParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(value)

  if (!match) return null

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] ?? 0),
    minute: Number(match[5] ?? 0),
    second: Number(match[6] ?? 0),
  }
}

function formatDateInputValue(parts: DateTimeParts): string {
  return [
    parts.year,
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-')
}

function formatTimeInputValue(parts: DateTimeParts): string {
  return [String(parts.hour).padStart(2, '0'), String(parts.minute).padStart(2, '0')].join(':')
}

function getPartValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? '0'
}

function isLocalTimeZone(timeZone: string): boolean {
  return !timeZone || timeZone === LOCAL_TIME_ZONE
}

function isValidDate(date: Date): boolean {
  return Number.isFinite(date.getTime())
}
