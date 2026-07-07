import { describe, expect, it } from 'vitest'
import { CalendarDate } from '@internationalized/date'
import type { AnalyticsPeriodV2 } from '@entities/analytics'
import {
  canStepForward,
  currentPeriod,
  fromCalendarDate,
  isCurrentPeriod,
  mondayOf,
  previousRange,
  rangeDays,
  resolveRange,
  shiftRange,
  stepPeriod,
} from '../model/period-step'

// Thu Jul 2, 2026 — a fixed "today" so tests don't depend on the wall clock.
const T0 = new CalendarDate(2026, 7, 2)

const day = (date: string): AnalyticsPeriodV2 => ({ kind: 'day', date })
const week = (date: string): AnalyticsPeriodV2 => ({ kind: 'week', date })
const month = (date: string): AnalyticsPeriodV2 => ({ kind: 'month', date })
const year = (date: string): AnalyticsPeriodV2 => ({ kind: 'year', date })
const custom = (from: string, to: string): AnalyticsPeriodV2 => ({
  kind: 'custom',
  range: { from, to },
})

const iso = (r: { start: CalendarDate; end: CalendarDate }) => ({
  start: fromCalendarDate(r.start),
  end: fromCalendarDate(r.end),
})

describe('mondayOf', () => {
  it('returns the same day for a Monday', () => {
    expect(fromCalendarDate(mondayOf(new CalendarDate(2026, 6, 29)))).toBe('2026-06-29')
  })

  it('maps Sunday to the previous Monday', () => {
    expect(fromCalendarDate(mondayOf(new CalendarDate(2026, 7, 5)))).toBe('2026-06-29')
  })

  it('maps a mid-week day to its Monday', () => {
    expect(fromCalendarDate(mondayOf(T0))).toBe('2026-06-29')
  })
})

describe('resolveRange', () => {
  it('day: a single day', () => {
    expect(iso(resolveRange(day('2026-07-02')))).toEqual({ start: '2026-07-02', end: '2026-07-02' })
  })

  it('week: Monday..Sunday around the anchor', () => {
    expect(iso(resolveRange(week('2026-07-02')))).toEqual({
      start: '2026-06-29',
      end: '2026-07-05',
    })
  })

  it('week: a Sunday anchor belongs to the week that just ended', () => {
    expect(iso(resolveRange(week('2026-07-05')))).toEqual({
      start: '2026-06-29',
      end: '2026-07-05',
    })
  })

  it('month: first..last day of the anchor month', () => {
    expect(iso(resolveRange(month('2026-07-15')))).toEqual({
      start: '2026-07-01',
      end: '2026-07-31',
    })
  })

  it('year: Jan 1..Dec 31 of the anchor year', () => {
    expect(iso(resolveRange(year('2026-07-02')))).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
    })
  })

  it('custom: the picked range verbatim', () => {
    expect(iso(resolveRange(custom('2026-06-10', '2026-06-19')))).toEqual({
      start: '2026-06-10',
      end: '2026-06-19',
    })
  })
})

describe('shiftRange / rangeDays', () => {
  it('counts inclusive days', () => {
    expect(rangeDays({ start: T0, end: T0 })).toBe(1)
    expect(
      rangeDays({ start: new CalendarDate(2026, 6, 29), end: new CalendarDate(2026, 7, 5) }),
    ).toBe(7)
  })

  it('steps an arbitrary range by its own length', () => {
    const r = { start: new CalendarDate(2026, 6, 10), end: new CalendarDate(2026, 6, 19) } // 10 days
    expect(iso(shiftRange(r, -1))).toEqual({ start: '2026-05-31', end: '2026-06-09' })
  })

  it('is symmetric: back then forward returns the original range', () => {
    const r = { start: new CalendarDate(2026, 6, 10), end: new CalendarDate(2026, 6, 19) }
    expect(iso(shiftRange(shiftRange(r, -1), 1))).toEqual({ start: '2026-06-10', end: '2026-06-19' })
  })
})

describe('stepPeriod', () => {
  it('day: keeps kind, shifts by one day', () => {
    expect(stepPeriod(day('2026-07-02'), -1)).toEqual(day('2026-07-01'))
    expect(stepPeriod(day('2026-07-02'), 1)).toEqual(day('2026-07-03'))
  })

  it('week: shifts the anchor by 7 days, resolving to the adjacent week', () => {
    const prev = stepPeriod(week('2026-07-02'), -1)
    expect(prev).toEqual(week('2026-06-25'))
    expect(iso(resolveRange(prev))).toEqual({ start: '2026-06-22', end: '2026-06-28' })
  })

  it('month: steps to the first of the adjacent month', () => {
    expect(stepPeriod(month('2026-07-15'), -1)).toEqual(month('2026-06-01'))
  })

  it('month: steps across the year boundary (Jan → Dec)', () => {
    expect(stepPeriod(month('2026-01-15'), -1)).toEqual(month('2025-12-01'))
  })

  it('year: keeps kind, shifts by one year', () => {
    expect(stepPeriod(year('2026-07-02'), -1)).toEqual(year('2025-01-01'))
    expect(stepPeriod(year('2026-07-02'), 1)).toEqual(year('2027-01-01'))
  })

  it('custom: shifts by its own length, staying custom', () => {
    expect(stepPeriod(custom('2026-06-15', '2026-06-21'), -1)).toEqual(
      custom('2026-06-08', '2026-06-14'),
    )
  })
})

describe('isCurrentPeriod', () => {
  it('is true when the period contains today', () => {
    expect(isCurrentPeriod(day('2026-07-02'), T0)).toBe(true)
    expect(isCurrentPeriod(week('2026-07-02'), T0)).toBe(true)
    expect(isCurrentPeriod(month('2026-07-15'), T0)).toBe(true)
    expect(isCurrentPeriod(year('2026-03-01'), T0)).toBe(true)
  })

  it('is false for a past period', () => {
    expect(isCurrentPeriod(day('2026-07-01'), T0)).toBe(false)
    expect(isCurrentPeriod(week('2026-06-25'), T0)).toBe(false)
    expect(isCurrentPeriod(month('2026-06-15'), T0)).toBe(false)
    expect(isCurrentPeriod(year('2025-06-01'), T0)).toBe(false)
  })
})

describe('currentPeriod', () => {
  it('anchors each kind at today', () => {
    expect(currentPeriod('day', T0)).toEqual(day('2026-07-02'))
    expect(currentPeriod('week', T0)).toEqual(week('2026-07-02'))
    expect(currentPeriod('month', T0)).toEqual(month('2026-07-02'))
    expect(currentPeriod('year', T0)).toEqual(year('2026-07-02'))
  })

  it('custom defaults to the last 7 days', () => {
    expect(currentPeriod('custom', T0)).toEqual(custom('2026-06-26', '2026-07-02'))
  })
})

describe('canStepForward', () => {
  it('blocks stepping into the future from current periods', () => {
    expect(canStepForward(day('2026-07-02'), T0)).toBe(false)
    expect(canStepForward(week('2026-07-02'), T0)).toBe(false)
    expect(canStepForward(month('2026-07-15'), T0)).toBe(false)
    expect(canStepForward(year('2026-03-01'), T0)).toBe(false)
  })

  it('allows stepping forward from past periods', () => {
    expect(canStepForward(month('2026-05-15'), T0)).toBe(true)
    expect(canStepForward(week('2026-06-01'), T0)).toBe(true)
    expect(canStepForward(day('2026-07-01'), T0)).toBe(true)
  })
})

describe('previousRange', () => {
  it('anchored: the preceding unit', () => {
    expect(iso(previousRange(month('2026-07-15')))).toEqual({
      start: '2026-06-01',
      end: '2026-06-30',
    })
  })

  it('custom: the preceding equal-length block', () => {
    expect(iso(previousRange(custom('2026-06-15', '2026-06-21')))).toEqual({
      start: '2026-06-08',
      end: '2026-06-14',
    })
  })
})
