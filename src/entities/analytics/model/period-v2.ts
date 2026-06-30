import type {
  AnalyticsGranularity,
  AnalyticsPeriodPreset,
  AnalyticsPeriodV2,
} from './types'

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

function isCustom(period: AnalyticsPeriodV2): period is { kind: 'custom'; range: { from: string; to: string } } {
  return typeof period !== 'string'
}

export function periodToDateRangeV2(
  period: AnalyticsPeriodV2,
  now = new Date(),
): { from: string; to: string } {
  if (isCustom(period)) {
    const from = parseLocalDate(period.range.from, DAY_START)
    const to = parseLocalDate(period.range.to, DAY_END)
    return { from: from.toISOString(), to: to.toISOString() }
  }

  let from: Date
  let to: Date

  switch (period) {
    case 'today':
      from = startOfDay(now)
      to = endOfDay(now)
      break
    case 'this_week':
      from = startOfWeek(now)
      to = endOfDay(addDays(from, 6))
      break
    case 'last_week':
      from = addDays(startOfWeek(now), -7)
      to = endOfDay(addDays(from, 6))
      break
    case 'this_month':
      from = firstOfMonth(now)
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, ...DAY_END)
      break
    case 'last_month':
      from = firstOfMonth(now, -1)
      to = new Date(now.getFullYear(), now.getMonth(), 0, ...DAY_END)
      break
  }

  return { from: from.toISOString(), to: to.toISOString() }
}

/**
 * The period to compare against. For calendar presets this is the matching
 * preceding calendar period (today→yesterday, this_week→last week, etc.). For a
 * custom range it is an equal-length block ending immediately before `from`.
 */
export function previousPeriodRange(
  period: AnalyticsPeriodV2,
  now = new Date(),
): { from: string; to: string } {
  if (isCustom(period)) {
    const { from, to } = periodToDateRangeV2(period, now)
    const fromMs = Date.parse(from)
    const len = Date.parse(to) - fromMs
    return {
      from: new Date(fromMs - 1 - len).toISOString(),
      to: new Date(fromMs - 1).toISOString(),
    }
  }

  const prevAnchor: Record<AnalyticsPeriodPreset, () => { from: string; to: string }> = {
    today: () => periodToDateRangeV2('today', addDays(now, -1)),
    this_week: () => periodToDateRangeV2('this_week', addDays(now, -7)),
    last_week: () => periodToDateRangeV2('this_week', addDays(now, -14)),
    this_month: () => periodToDateRangeV2('this_month', firstOfMonth(now, -1)),
    last_month: () => periodToDateRangeV2('this_month', firstOfMonth(now, -2)),
  }

  return prevAnchor[period]()
}

const MS_PER_DAY = 86_400_000

/** Bucket size for the revenue time-series of the given period. */
export function periodGranularity(
  period: AnalyticsPeriodV2,
  now = new Date(),
): AnalyticsGranularity {
  if (isCustom(period)) {
    const { from, to } = periodToDateRangeV2(period, now)
    const days = (Date.parse(to) - Date.parse(from)) / MS_PER_DAY
    if (days <= 2) return 'hour'
    if (days <= 31) return 'day'
    if (days <= 92) return 'week'
    return 'month'
  }

  switch (period) {
    case 'today':
      return 'hour'
    case 'this_week':
    case 'last_week':
      return 'day'
    case 'this_month':
    case 'last_month':
      return 'week'
  }
}
