import {
  CalendarDate,
  endOfMonth,
  getLocalTimeZone,
  startOfMonth,
  today,
} from '@internationalized/date'
import type { AnalyticsPeriodPreset, AnalyticsPeriodV2 } from '@entities/analytics'

/**
 * Pure calendar-date helpers behind the toolbar's ←/→ period stepping.
 * Weeks start on Monday and full calendar months step by month — the same
 * conventions as `entities/analytics/model/period-v2`.
 */

const MS_PER_DAY = 86_400_000

export interface DateRange {
  start: CalendarDate
  end: CalendarDate
}

export const PERIOD_PRESETS: AnalyticsPeriodPreset[] = [
  'today',
  'this_week',
  'this_month',
  'last_week',
  'last_month',
]

export function toCalendarDate(value: string): CalendarDate {
  const [y = 0, m = 1, d = 1] = value.split('-').map(Number)
  return new CalendarDate(y, m, d)
}

export function fromCalendarDate(d: CalendarDate): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

/** Monday of the week containing `d`. Sunday belongs to the previous week. */
export function mondayOf(d: CalendarDate, tz = getLocalTimeZone()): CalendarDate {
  const dow = d.toDate(tz).getDay() // 0 = Sun
  return d.subtract({ days: dow === 0 ? 6 : dow - 1 })
}

export function presetRange(preset: AnalyticsPeriodPreset, t0: CalendarDate): DateRange {
  switch (preset) {
    case 'today':
      return { start: t0, end: t0 }
    case 'this_week': {
      const start = mondayOf(t0)
      return { start, end: start.add({ days: 6 }) }
    }
    case 'last_week': {
      const start = mondayOf(t0).subtract({ days: 7 })
      return { start, end: start.add({ days: 6 }) }
    }
    case 'this_month':
      return { start: startOfMonth(t0), end: endOfMonth(t0) }
    case 'last_month': {
      const start = startOfMonth(t0).subtract({ months: 1 })
      return { start, end: endOfMonth(start) }
    }
  }
}

/** The selected period as concrete calendar dates. */
export function resolveRange(period: AnalyticsPeriodV2, t0: CalendarDate): DateRange {
  if (typeof period !== 'string') {
    return { start: toCalendarDate(period.range.from), end: toCalendarDate(period.range.to) }
  }
  return presetRange(period, t0)
}

function isFullMonth(r: DateRange): boolean {
  return (
    r.start.compare(startOfMonth(r.start)) === 0 && r.end.compare(endOfMonth(r.start)) === 0
  )
}

export function rangeDays(r: DateRange, tz = getLocalTimeZone()): number {
  return Math.round((r.end.toDate(tz).getTime() - r.start.toDate(tz).getTime()) / MS_PER_DAY) + 1
}

/**
 * The adjacent period: full calendar months step by month, everything else
 * shifts by its own length in days. Matches `previousPeriodRange` semantics.
 */
export function shiftRange(r: DateRange, dir: 1 | -1): DateRange {
  if (isFullMonth(r)) {
    const start = startOfMonth(r.start).add({ months: dir })
    return { start, end: endOfMonth(start) }
  }
  const days = rangeDays(r) * dir
  return { start: r.start.add({ days }), end: r.end.add({ days }) }
}

/** If the range is exactly a preset, return its key so the chip stays highlighted. */
export function matchPreset(r: DateRange, t0: CalendarDate): AnalyticsPeriodPreset | null {
  for (const preset of PERIOD_PRESETS) {
    const pr = presetRange(preset, t0)
    if (r.start.compare(pr.start) === 0 && r.end.compare(pr.end) === 0) return preset
  }
  return null
}

/** The period one step away, collapsing back to a preset when possible. */
export function stepPeriod(
  period: AnalyticsPeriodV2,
  dir: 1 | -1,
  t0 = today(getLocalTimeZone()),
): AnalyticsPeriodV2 {
  const next = shiftRange(resolveRange(period, t0), dir)
  return (
    matchPreset(next, t0) ?? {
      kind: 'custom',
      range: { from: fromCalendarDate(next.start), to: fromCalendarDate(next.end) },
    }
  )
}

/** Forward stepping stops once the next period would start in the future. */
export function canStepForward(
  period: AnalyticsPeriodV2,
  t0 = today(getLocalTimeZone()),
): boolean {
  return shiftRange(resolveRange(period, t0), 1).start.compare(t0) <= 0
}
