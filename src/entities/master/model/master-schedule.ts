import type { MasterSchedule, MasterScheduleBreak, MasterScheduleDayKey } from './types'

/** Week order, Monday-first — matches DEFAULT_CALENDAR_FIRST_DAY = 1. */
export const DAY_ORDER: MasterScheduleDayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

/** Default working window applied when a master has no saved schedule. */
export const DEFAULT_DAY_START = '10:00'
export const DEFAULT_DAY_END = '19:00'

/** Days enabled by default (Mon–Fri); Sat/Sun start as days off. */
const DEFAULT_ENABLED_DAYS: ReadonlySet<MasterScheduleDayKey> = new Set([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
])

/**
 * A fully-resolved day: `start`/`end` are always concrete `'HH:mm'` strings and
 * `breaks` is always an array. This is the shape the Working hours form edits.
 * It is structurally assignable to `MasterScheduleDay`, so a `NormalizedSchedule`
 * can be persisted directly as a `MasterSchedule`.
 */
export interface NormalizedScheduleDay {
  enabled: boolean
  start: string
  end: string
  breaks: MasterScheduleBreak[]
}

export interface NormalizedSchedule {
  timezone: string | null
  days: Record<MasterScheduleDayKey, NormalizedScheduleDay>
}

// --- Time helpers -------------------------------------------------------------

const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

/** True when `value` is a valid 24h `'HH:mm'` time string. */
export function isValidHHmm(value: unknown): value is string {
  return typeof value === 'string' && HHMM_PATTERN.test(value)
}

/** Minutes since midnight for a valid `'HH:mm'` string, or `NaN` otherwise. */
export function toMinutes(value: string): number {
  if (!isValidHHmm(value)) return Number.NaN
  const [hours, minutes] = value.split(':')
  return Number(hours) * 60 + Number(minutes)
}

// --- Defaults & normalization -------------------------------------------------

function createDefaultDay(enabled: boolean): NormalizedScheduleDay {
  return { enabled, start: DEFAULT_DAY_START, end: DEFAULT_DAY_END, breaks: [] }
}

/**
 * A sensible starting schedule for masters with no saved availability:
 * Mon–Fri 10:00–19:00 with no breaks, Sat/Sun off (times preserved so toggling
 * a day back on restores a usable window).
 */
export function createDefaultSchedule(): MasterSchedule {
  const days = {} as Record<MasterScheduleDayKey, NormalizedScheduleDay>
  for (const key of DAY_ORDER) {
    days[key] = createDefaultDay(DEFAULT_ENABLED_DAYS.has(key))
  }
  return { timezone: null, days }
}

function normalizeBreaks(raw: unknown): MasterScheduleBreak[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (item): item is MasterScheduleBreak =>
        Boolean(item) &&
        isValidHHmm((item as MasterScheduleBreak).start) &&
        isValidHHmm((item as MasterScheduleBreak).end),
    )
    .map((item) => ({ start: item.start, end: item.end }))
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
}

/**
 * Coerces a raw (possibly partial or malformed) stored schedule into a complete
 * 7-day structure with concrete times. Missing/invalid fields fall back to the
 * defaults; breaks are filtered to valid entries and sorted by start time.
 * Times of disabled days are preserved so toggling a day back on restores them.
 */
export function normalizeSchedule(raw: MasterSchedule | null | undefined): NormalizedSchedule {
  const rawDays = raw?.days ?? {}
  const days = {} as Record<MasterScheduleDayKey, NormalizedScheduleDay>

  for (const key of DAY_ORDER) {
    const fallback = createDefaultDay(DEFAULT_ENABLED_DAYS.has(key))
    const rawDay = rawDays[key]

    if (!rawDay) {
      days[key] = fallback
      continue
    }

    days[key] = {
      enabled: Boolean(rawDay.enabled),
      start: isValidHHmm(rawDay.start) ? rawDay.start : fallback.start,
      end: isValidHHmm(rawDay.end) ? rawDay.end : fallback.end,
      breaks: normalizeBreaks(rawDay.breaks),
    }
  }

  return {
    timezone: typeof raw?.timezone === 'string' && raw.timezone.trim() ? raw.timezone : null,
    days,
  }
}

// --- Validation ---------------------------------------------------------------

export type ScheduleDayErrorCode =
  | 'endBeforeStart'
  | 'breakEndBeforeStart'
  | 'breakOutsideHours'
  | 'breaksOverlap'

/** A single hard-rule violation for one day. `breakIndex` is set for break-level errors. */
export interface ScheduleDayError {
  code: ScheduleDayErrorCode
  breakIndex?: number
}

/**
 * Hard validation rules for one day. A disabled day is always valid. Returns the
 * structured violations (no message strings — the UI maps codes to i18n keys):
 * - working hours: end after start
 * - each break: end after start
 * - each break: fully inside [start, end]
 * - breaks do not overlap each other
 */
export function validateScheduleDay(day: NormalizedScheduleDay): ScheduleDayError[] {
  if (!day.enabled) return []

  const errors: ScheduleDayError[] = []
  const dayStart = toMinutes(day.start)
  const dayEnd = toMinutes(day.end)

  if (!(dayEnd > dayStart)) {
    errors.push({ code: 'endBeforeStart' })
  }

  day.breaks.forEach((slot, index) => {
    const breakStart = toMinutes(slot.start)
    const breakEnd = toMinutes(slot.end)

    if (!(breakEnd > breakStart)) {
      errors.push({ code: 'breakEndBeforeStart', breakIndex: index })
      return
    }

    if (breakStart < dayStart || breakEnd > dayEnd) {
      errors.push({ code: 'breakOutsideHours', breakIndex: index })
    }
  })

  // Overlap check on breaks sorted by start time.
  const ordered = day.breaks
    .map((slot, index) => ({ index, start: toMinutes(slot.start), end: toMinutes(slot.end) }))
    .filter((slot) => Number.isFinite(slot.start) && Number.isFinite(slot.end))
    .sort((a, b) => a.start - b.start)

  for (let i = 1; i < ordered.length; i++) {
    const current = ordered[i]
    const previous = ordered[i - 1]
    if (current && previous && current.start < previous.end) {
      errors.push({ code: 'breaksOverlap', breakIndex: current.index })
    }
  }

  return errors
}

export interface ScheduleValidationResult {
  ok: boolean
  days: Record<MasterScheduleDayKey, ScheduleDayError[]>
}

/** Validates every enabled day; `ok` is true when no day has violations. */
export function validateSchedule(schedule: NormalizedSchedule): ScheduleValidationResult {
  const days = {} as Record<MasterScheduleDayKey, ScheduleDayError[]>
  let ok = true

  for (const key of DAY_ORDER) {
    const errors = validateScheduleDay(schedule.days[key])
    days[key] = errors
    if (errors.length > 0) ok = false
  }

  return { ok, days }
}
