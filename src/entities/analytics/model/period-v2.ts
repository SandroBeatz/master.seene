import type { AnalyticsAnchoredKind, AnalyticsGranularity, AnalyticsPeriodV2 } from './types'

/**
 * V2 period helpers. All boundaries are computed in the master's LOCAL timezone
 * (via the native `Date` constructor, not UTC) — the same philosophy as the V1
 * `periodToDateRange`. Week starts on Monday.
 *
 * Three pure functions:
 *  - `periodToDateRangeV2`  → the [from, to] instants of the selected period
 *  - `previousPeriodRange`  → the comparable preceding period (for % deltas / overlay)
 *  - `periodGranularity`    → the bucket size for the revenue time-series
 */

const DAY_START = [0, 0, 0, 0] as const
const DAY_END = [23, 59, 59, 999] as const

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), ...DAY_START)
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), ...DAY_END)
}

/** Monday 00:00 of the week containing `d`. Sunday belongs to the previous week. */
function startOfWeek(d: Date): Date {
  const day = d.getDay() // 0 = Sun, 1 = Mon, …, 6 = Sat
  const toMonday = day === 0 ? -6 : 1 - day
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + toMonday, ...DAY_START)
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, ...DAY_START)
}

/** First day of the month `offset` months away from `d` (offset can be negative). */
function firstOfMonth(d: Date, offset = 0): Date {
  return new Date(d.getFullYear(), d.getMonth() + offset, 1, ...DAY_START)
}

/** Parses a 'YYYY-MM-DD' local calendar date into a Date at the given time. */
function parseLocalDate(value: string, time: readonly [number, number, number, number]): Date {
  const [y = 0, m = 1, d = 1] = value.split('-').map(Number)
  return new Date(y, m - 1, d, ...time)
}

function isCustom(
  period: AnalyticsPeriodV2,
): period is { kind: 'custom'; range: { from: string; to: string } } {
  return period.kind === 'custom'
}

/** The [from, to] Date bounds of an anchored calendar unit around `anchor`. */
function boundsFor(kind: AnalyticsAnchoredKind, anchor: Date): { from: Date; to: Date } {
  switch (kind) {
    case 'day':
      return { from: startOfDay(anchor), to: endOfDay(anchor) }
    case 'week': {
      const from = startOfWeek(anchor)
      return { from, to: endOfDay(addDays(from, 6)) }
    }
    case 'month':
      return {
        from: firstOfMonth(anchor),
        to: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, ...DAY_END),
      }
    case 'year':
      return {
        from: new Date(anchor.getFullYear(), 0, 1, ...DAY_START),
        to: new Date(anchor.getFullYear(), 11, 31, ...DAY_END),
      }
  }
}

/** The anchor date one unit of `kind` before `anchor` (for the comparison window). */
function shiftAnchor(kind: AnalyticsAnchoredKind, anchor: Date): Date {
  switch (kind) {
    case 'day':
      return addDays(anchor, -1)
    case 'week':
      return addDays(anchor, -7)
    case 'month':
      return firstOfMonth(anchor, -1)
    case 'year':
      return new Date(anchor.getFullYear() - 1, anchor.getMonth(), anchor.getDate(), ...DAY_START)
  }
}

export function periodToDateRangeV2(period: AnalyticsPeriodV2): { from: string; to: string } {
  if (isCustom(period)) {
    const from = parseLocalDate(period.range.from, DAY_START)
    const to = parseLocalDate(period.range.to, DAY_END)
    return { from: from.toISOString(), to: to.toISOString() }
  }

  const anchor = parseLocalDate(period.date, DAY_START)
  const { from, to } = boundsFor(period.kind, anchor)
  return { from: from.toISOString(), to: to.toISOString() }
}

/**
 * The period to compare against. For anchored kinds this is the matching
 * preceding calendar unit (day→yesterday, week→last week, month→previous month,
 * year→previous year). For a custom range it is an equal-length block ending
 * immediately before `from`.
 */
export function previousPeriodRange(period: AnalyticsPeriodV2): { from: string; to: string } {
  if (isCustom(period)) {
    const { from, to } = periodToDateRangeV2(period)
    const fromMs = Date.parse(from)
    const len = Date.parse(to) - fromMs
    return {
      from: new Date(fromMs - 1 - len).toISOString(),
      to: new Date(fromMs - 1).toISOString(),
    }
  }

  const anchor = parseLocalDate(period.date, DAY_START)
  const { from, to } = boundsFor(period.kind, shiftAnchor(period.kind, anchor))
  return { from: from.toISOString(), to: to.toISOString() }
}

/**
 * A rolling window of the last `days` local calendar days, including today —
 * e.g. `rollingWindowRange(30)` spans 30 full days ending at today 23:59:59.
 * Used by the fixed-window widgets (top services / client mix / busiest days).
 */
export function rollingWindowRange(days: number, now = new Date()): { from: string; to: string } {
  const from = addDays(startOfDay(now), -(days - 1))
  return { from: from.toISOString(), to: endOfDay(now).toISOString() }
}

const MS_PER_DAY = 86_400_000

/** Bucket size for the revenue time-series of the given period. */
export function periodGranularity(period: AnalyticsPeriodV2): AnalyticsGranularity {
  if (isCustom(period)) {
    const { from, to } = periodToDateRangeV2(period)
    const days = (Date.parse(to) - Date.parse(from)) / MS_PER_DAY
    if (days <= 2) return 'hour'
    if (days <= 31) return 'day'
    if (days <= 92) return 'week'
    return 'month'
  }

  switch (period.kind) {
    case 'day':
      return 'hour'
    case 'week':
      return 'day'
    case 'month':
      return 'day'
    case 'year':
      return 'month'
  }
}
