import { describe, expect, it } from 'vitest'
import type { AnalyticsPeriodV2 } from '../types'
import {
  periodGranularity,
  periodToDateRangeV2,
  previousPeriodRange,
  rollingWindowRange,
} from '../period-v2'

const iso = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0, ms = 0): string =>
  new Date(y, mo, d, h, mi, s, ms).toISOString()

describe('periodToDateRangeV2', () => {
  it('today: start..end of the given day', () => {
    const now = new Date(2026, 4, 15, 14, 30) // Fri May 15 2026
    expect(periodToDateRangeV2('today', now)).toEqual({
      from: iso(2026, 4, 15, 0, 0, 0, 0),
      to: iso(2026, 4, 15, 23, 59, 59, 999),
    })
  })

  it('this_week: Monday..Sunday (Friday anchor)', () => {
    const now = new Date(2026, 4, 15, 10, 0) // Fri May 15
    expect(periodToDateRangeV2('this_week', now)).toEqual({
      from: iso(2026, 4, 11, 0, 0, 0, 0), // Mon May 11
      to: iso(2026, 4, 17, 23, 59, 59, 999), // Sun May 17
    })
  })

  it('this_week: Sunday belongs to the week that just ended', () => {
    const now = new Date(2026, 4, 17, 10, 0) // Sun May 17
    expect(periodToDateRangeV2('this_week', now)).toEqual({
      from: iso(2026, 4, 11, 0, 0, 0, 0),
      to: iso(2026, 4, 17, 23, 59, 59, 999),
    })
  })

  it('last_week: the Monday..Sunday before this week', () => {
    const now = new Date(2026, 4, 15, 10, 0) // Fri May 15
    expect(periodToDateRangeV2('last_week', now)).toEqual({
      from: iso(2026, 4, 4, 0, 0, 0, 0), // Mon May 4
      to: iso(2026, 4, 10, 23, 59, 59, 999), // Sun May 10
    })
  })

  it('this_month: first..last day of month', () => {
    const now = new Date(2026, 4, 15, 10, 0) // May 2026
    expect(periodToDateRangeV2('this_month', now)).toEqual({
      from: iso(2026, 4, 1, 0, 0, 0, 0),
      to: iso(2026, 4, 31, 23, 59, 59, 999),
    })
  })

  it('last_month: first..last day of previous month (Jan→handles year, Feb non-leap)', () => {
    const now = new Date(2026, 2, 10, 10, 0) // Mar 2026 → prev = Feb 2026 (28 days)
    expect(periodToDateRangeV2('last_month', now)).toEqual({
      from: iso(2026, 1, 1, 0, 0, 0, 0),
      to: iso(2026, 1, 28, 23, 59, 59, 999),
    })
  })

  it('last_month: crosses year boundary (Jan→Dec)', () => {
    const now = new Date(2026, 0, 10, 10, 0) // Jan 2026 → prev = Dec 2025
    expect(periodToDateRangeV2('last_month', now)).toEqual({
      from: iso(2025, 11, 1, 0, 0, 0, 0),
      to: iso(2025, 11, 31, 23, 59, 59, 999),
    })
  })

  it('custom: normalizes to start of from-day and end of to-day', () => {
    const period: AnalyticsPeriodV2 = {
      kind: 'custom',
      range: { from: '2026-03-05', to: '2026-03-20' },
    }
    expect(periodToDateRangeV2(period)).toEqual({
      from: iso(2026, 2, 5, 0, 0, 0, 0),
      to: iso(2026, 2, 20, 23, 59, 59, 999),
    })
  })

  it('custom: a single-day range spans that whole day', () => {
    const period: AnalyticsPeriodV2 = {
      kind: 'custom',
      range: { from: '2026-03-05', to: '2026-03-05' },
    }
    expect(periodToDateRangeV2(period)).toEqual({
      from: iso(2026, 2, 5, 0, 0, 0, 0),
      to: iso(2026, 2, 5, 23, 59, 59, 999),
    })
  })

  it('this_week: Monday anchor starts its own week', () => {
    const now = new Date(2026, 4, 11, 0, 30) // Mon May 11, just after midnight
    expect(periodToDateRangeV2('this_week', now)).toEqual({
      from: iso(2026, 4, 11, 0, 0, 0, 0),
      to: iso(2026, 4, 17, 23, 59, 59, 999),
    })
  })

  it('last_week: crosses a month boundary', () => {
    const now = new Date(2026, 5, 3, 10, 0) // Wed Jun 3 → last week = May 25..31
    expect(periodToDateRangeV2('last_week', now)).toEqual({
      from: iso(2026, 4, 25, 0, 0, 0, 0),
      to: iso(2026, 4, 31, 23, 59, 59, 999),
    })
  })
})

describe('previousPeriodRange', () => {
  it('today → yesterday', () => {
    const now = new Date(2026, 4, 15, 14, 30)
    expect(previousPeriodRange('today', now)).toEqual({
      from: iso(2026, 4, 14, 0, 0, 0, 0),
      to: iso(2026, 4, 14, 23, 59, 59, 999),
    })
  })

  it('this_week → the preceding week', () => {
    const now = new Date(2026, 4, 15, 10, 0) // week Mon May 11..Sun 17
    expect(previousPeriodRange('this_week', now)).toEqual({
      from: iso(2026, 4, 4, 0, 0, 0, 0),
      to: iso(2026, 4, 10, 23, 59, 59, 999),
    })
  })

  it('this_month → the preceding month', () => {
    const now = new Date(2026, 4, 15, 10, 0) // May → Apr
    expect(previousPeriodRange('this_month', now)).toEqual({
      from: iso(2026, 3, 1, 0, 0, 0, 0),
      to: iso(2026, 3, 30, 23, 59, 59, 999),
    })
  })

  it('last_month → the month before last', () => {
    const now = new Date(2026, 4, 15, 10, 0) // last_month = Apr → prev = Mar
    expect(previousPeriodRange('last_month', now)).toEqual({
      from: iso(2026, 2, 1, 0, 0, 0, 0),
      to: iso(2026, 2, 31, 23, 59, 59, 999),
    })
  })

  it('last_week → the week before last', () => {
    const now = new Date(2026, 4, 15, 10, 0) // last_week = May 4..10 → prev = Apr 27..May 3
    expect(previousPeriodRange('last_week', now)).toEqual({
      from: iso(2026, 3, 27, 0, 0, 0, 0),
      to: iso(2026, 4, 3, 23, 59, 59, 999),
    })
  })

  it('today → yesterday across a month boundary', () => {
    const now = new Date(2026, 5, 1, 9, 0) // Jun 1 → May 31
    expect(previousPeriodRange('today', now)).toEqual({
      from: iso(2026, 4, 31, 0, 0, 0, 0),
      to: iso(2026, 4, 31, 23, 59, 59, 999),
    })
  })

  it('this_month → previous month of a different length (Mar → Feb)', () => {
    const now = new Date(2026, 2, 15, 10, 0) // Mar 2026 → Feb 2026 (28 days)
    expect(previousPeriodRange('this_month', now)).toEqual({
      from: iso(2026, 1, 1, 0, 0, 0, 0),
      to: iso(2026, 1, 28, 23, 59, 59, 999),
    })
  })

  it('this_month → previous month across a year boundary (Jan → Dec)', () => {
    const now = new Date(2026, 0, 15, 10, 0)
    expect(previousPeriodRange('this_month', now)).toEqual({
      from: iso(2025, 11, 1, 0, 0, 0, 0),
      to: iso(2025, 11, 31, 23, 59, 59, 999),
    })
  })

  it('custom → equal-length block ending just before `from`', () => {
    // 16-day range (Mar 5..Mar 20 inclusive); previous ends 1ms before Mar 5 00:00
    const period: AnalyticsPeriodV2 = {
      kind: 'custom',
      range: { from: '2026-03-05', to: '2026-03-20' },
    }
    const { from, to } = previousPeriodRange(period)
    const curFrom = Date.parse(iso(2026, 2, 5, 0, 0, 0, 0))
    const curTo = Date.parse(iso(2026, 2, 20, 23, 59, 59, 999))
    expect(Date.parse(to)).toBe(curFrom - 1)
    expect(Date.parse(from)).toBe(curFrom - 1 - (curTo - curFrom))
  })
})

describe('periodGranularity', () => {
  it('maps presets to fixed bucket sizes', () => {
    expect(periodGranularity('today')).toBe('hour')
    expect(periodGranularity('this_week')).toBe('day')
    expect(periodGranularity('last_week')).toBe('day')
    expect(periodGranularity('this_month')).toBe('week')
    expect(periodGranularity('last_month')).toBe('week')
  })

  it('chooses granularity by custom range length', () => {
    const range = (from: string, to: string): AnalyticsPeriodV2 => ({
      kind: 'custom',
      range: { from, to },
    })
    expect(periodGranularity(range('2026-03-05', '2026-03-06'))).toBe('hour') // 2 days
    expect(periodGranularity(range('2026-03-01', '2026-03-20'))).toBe('day') // ~20 days
    expect(periodGranularity(range('2026-01-01', '2026-03-01'))).toBe('week') // ~60 days
    expect(periodGranularity(range('2026-01-01', '2026-12-31'))).toBe('month') // ~365 days
  })

  it('custom boundary lengths: 31 days is still daily, 32 becomes weekly', () => {
    const range = (from: string, to: string): AnalyticsPeriodV2 => ({
      kind: 'custom',
      range: { from, to },
    })
    expect(periodGranularity(range('2026-03-01', '2026-03-31'))).toBe('day') // 31 days
    expect(periodGranularity(range('2026-03-01', '2026-04-01'))).toBe('week') // 32 days
    expect(periodGranularity(range('2026-01-01', '2026-04-02'))).toBe('week') // 92 days
    expect(periodGranularity(range('2026-01-01', '2026-04-03'))).toBe('month') // 93 days
  })
})

describe('rollingWindowRange', () => {
  it('spans the last N local days including today', () => {
    const now = new Date(2026, 6, 6, 14, 30) // Mon Jul 6 2026
    expect(rollingWindowRange(30, now)).toEqual({
      from: iso(2026, 5, 7, 0, 0, 0, 0), // Jun 7 — 30 full days incl. today
      to: iso(2026, 6, 6, 23, 59, 59, 999),
    })
  })

  it('a 1-day window is exactly today', () => {
    const now = new Date(2026, 6, 6, 8, 0)
    expect(rollingWindowRange(1, now)).toEqual({
      from: iso(2026, 6, 6, 0, 0, 0, 0),
      to: iso(2026, 6, 6, 23, 59, 59, 999),
    })
  })

  it('crosses month boundaries by calendar days', () => {
    const now = new Date(2026, 2, 10, 12, 0) // Mar 10
    expect(rollingWindowRange(56, now).from).toBe(iso(2026, 0, 14, 0, 0, 0, 0)) // Jan 14
  })
})
