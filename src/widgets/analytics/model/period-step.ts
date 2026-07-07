import {
  CalendarDate,
  endOfMonth,
  getLocalTimeZone,
  startOfMonth,
  today,
} from '@internationalized/date'
import type {
  AnalyticsAnchoredKind,
  AnalyticsPeriodKind,
  AnalyticsPeriodV2,
} from '@entities/analytics'

/**
 * Pure calendar-date helpers behind the analytics toolbar. Each anchored period
 * (day/week/month/year) carries an anchor date; these helpers resolve it to a
 * concrete range, step it by one unit, and answer "is this the current period?".
 * Weeks start on Monday — the same convention as `entities/analytics/period-v2`.
 * Custom ranges step by their own length in days.
 */

const MS_PER_DAY = 86_400_000

export interface DateRange {
  start: CalendarDate
  end: CalendarDate
}

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

/** The calendar unit `kind` around its anchor date. */
function anchoredRange(kind: AnalyticsAnchoredKind, anchor: CalendarDate): DateRange {
  switch (kind) {
    case 'day':
      return { start: anchor, end: anchor }
    case 'week': {
      const start = mondayOf(anchor)
      return { start, end: start.add({ days: 6 }) }
    }
    case 'month':
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) }
    case 'year':
      return {
        start: new CalendarDate(anchor.year, 1, 1),
        end: new CalendarDate(anchor.year, 12, 31),
      }
  }
}

/** The anchor date one unit of `kind` away (dir = +1 forward, -1 back). */
function shiftAnchor(kind: AnalyticsAnchoredKind, anchor: CalendarDate, dir: 1 | -1): CalendarDate {
  switch (kind) {
    case 'day':
      return anchor.add({ days: dir })
    case 'week':
      return anchor.add({ days: 7 * dir })
    case 'month':
      // Normalize to the 1st first so a long anchor day never overflows the month.
      return startOfMonth(anchor).add({ months: dir })
    case 'year':
      return new CalendarDate(anchor.year + dir, 1, 1)
  }
}

export function rangeDays(r: DateRange, tz = getLocalTimeZone()): number {
  return Math.round((r.end.toDate(tz).getTime() - r.start.toDate(tz).getTime()) / MS_PER_DAY) + 1
}

/** Shift a range by its own length in days — used for custom ranges. */
export function shiftRange(r: DateRange, dir: 1 | -1): DateRange {
  const days = rangeDays(r) * dir
  return { start: r.start.add({ days }), end: r.end.add({ days }) }
}

/** The selected period as concrete calendar dates. */
export function resolveRange(period: AnalyticsPeriodV2): DateRange {
  if (period.kind === 'custom') {
    return { start: toCalendarDate(period.range.from), end: toCalendarDate(period.range.to) }
  }
  return anchoredRange(period.kind, toCalendarDate(period.date))
}

/** The comparison window: the preceding unit (or, for custom, the preceding equal block). */
export function previousRange(period: AnalyticsPeriodV2): DateRange {
  if (period.kind === 'custom') {
    return shiftRange(resolveRange(period), -1)
  }
  return anchoredRange(period.kind, shiftAnchor(period.kind, toCalendarDate(period.date), -1))
}

/** The period one unit away, keeping its kind (no collapsing — there are no presets). */
export function stepPeriod(period: AnalyticsPeriodV2, dir: 1 | -1): AnalyticsPeriodV2 {
  if (period.kind === 'custom') {
    const r = shiftRange(resolveRange(period), dir)
    return {
      kind: 'custom',
      range: { from: fromCalendarDate(r.start), to: fromCalendarDate(r.end) },
    }
  }
  const next = shiftAnchor(period.kind, toCalendarDate(period.date), dir)
  return { kind: period.kind, date: fromCalendarDate(next) }
}

/** Whether the period contains `t0` — i.e. it is the current day/week/month/year. */
export function isCurrentPeriod(
  period: AnalyticsPeriodV2,
  t0 = today(getLocalTimeZone()),
): boolean {
  const r = resolveRange(period)
  return r.start.compare(t0) <= 0 && t0.compare(r.end) <= 0
}

/** The period of the given kind anchored at today (for the "this X" jump button). */
export function currentPeriod(
  kind: AnalyticsPeriodKind,
  t0 = today(getLocalTimeZone()),
): AnalyticsPeriodV2 {
  if (kind === 'custom') {
    // No natural "current" custom range — default to the last 7 days.
    return {
      kind: 'custom',
      range: { from: fromCalendarDate(t0.subtract({ days: 6 })), to: fromCalendarDate(t0) },
    }
  }
  return { kind, date: fromCalendarDate(t0) }
}

/** Forward stepping stops once the next period would start in the future. */
export function canStepForward(period: AnalyticsPeriodV2, t0 = today(getLocalTimeZone())): boolean {
  return resolveRange(stepPeriod(period, 1)).start.compare(t0) <= 0
}
