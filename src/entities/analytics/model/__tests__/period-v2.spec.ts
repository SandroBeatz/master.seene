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

const day = (date: string): AnalyticsPeriodV2 => ({ kind: 'day', date })
const week = (date: string): AnalyticsPeriodV2 => ({ kind: 'week', date })
const month = (date: string): AnalyticsPeriodV2 => ({ kind: 'month', date })
const year = (date: string): AnalyticsPeriodV2 => ({ kind: 'year', date })
const custom = (from: string, to: string): AnalyticsPeriodV2 => ({
  kind: 'custom',
  range: { from, to },
})

describe('periodToDateRangeV2', () => {
  it('day: start..end of the anchor day', () => {
    expect(periodToDateRangeV2(day('2026-05-15'))).toEqual({
      from: iso(2026, 4, 15, 0, 0, 0, 0),
      to: iso(2026, 4, 15, 23, 59, 59, 999),
    })
  })

  it('week: Monday..Sunday (Friday anchor)', () => {
    expect(periodToDateRangeV2(week('2026-05-15'))).toEqual({
      from: iso(2026, 4, 11, 0, 0, 0, 0), // Mon May 11
      to: iso(2026, 4, 17, 23, 59, 59, 999), // Sun May 17
    })
  })

  it('week: Sunday anchor belongs to the week that just ended', () => {
    expect(periodToDateRangeV2(week('2026-05-17'))).toEqual({
      from: iso(2026, 4, 11, 0, 0, 0, 0),
      to: iso(2026, 4, 17, 23, 59, 59, 999),
    })
  })

  it('week: Monday anchor starts its own week', () => {
    expect(periodToDateRangeV2(week('2026-05-11'))).toEqual({
      from: iso(2026, 4, 11, 0, 0, 0, 0),
      to: iso(2026, 4, 17, 23, 59, 59, 999),
    })
  })

  it('week: crosses a month boundary', () => {
    expect(periodToDateRangeV2(week('2026-05-27'))).toEqual({
      from: iso(2026, 4, 25, 0, 0, 0, 0), // Mon May 25
      to: iso(2026, 4, 31, 23, 59, 59, 999), // Sun May 31
    })
  })

  it('month: first..last day of the anchor month', () => {
    expect(periodToDateRangeV2(month('2026-05-15'))).toEqual({
      from: iso(2026, 4, 1, 0, 0, 0, 0),
      to: iso(2026, 4, 31, 23, 59, 59, 999),
    })
  })

  it('month: non-leap February is 28 days', () => {
    expect(periodToDateRangeV2(month('2026-02-10'))).toEqual({
      from: iso(2026, 1, 1, 0, 0, 0, 0),
      to: iso(2026, 1, 28, 23, 59, 59, 999),
    })
  })

  it('year: Jan 1 00:00 .. Dec 31 23:59:59.999 of the anchor year', () => {
    expect(periodToDateRangeV2(year('2026-07-06'))).toEqual({
      from: iso(2026, 0, 1, 0, 0, 0, 0),
      to: iso(2026, 11, 31, 23, 59, 59, 999),
    })
  })

  it('custom: normalizes to start of from-day and end of to-day', () => {
    expect(periodToDateRangeV2(custom('2026-03-05', '2026-03-20'))).toEqual({
      from: iso(2026, 2, 5, 0, 0, 0, 0),
      to: iso(2026, 2, 20, 23, 59, 59, 999),
    })
  })

  it('custom: a single-day range spans that whole day', () => {
    expect(periodToDateRangeV2(custom('2026-03-05', '2026-03-05'))).toEqual({
      from: iso(2026, 2, 5, 0, 0, 0, 0),
      to: iso(2026, 2, 5, 23, 59, 59, 999),
    })
  })
})

describe('previousPeriodRange', () => {
  it('day → yesterday', () => {
    expect(previousPeriodRange(day('2026-05-15'))).toEqual({
      from: iso(2026, 4, 14, 0, 0, 0, 0),
      to: iso(2026, 4, 14, 23, 59, 59, 999),
    })
  })

  it('day → yesterday across a month boundary', () => {
    expect(previousPeriodRange(day('2026-06-01'))).toEqual({
      from: iso(2026, 4, 31, 0, 0, 0, 0),
      to: iso(2026, 4, 31, 23, 59, 59, 999),
    })
  })

  it('week → the preceding week', () => {
    expect(previousPeriodRange(week('2026-05-15'))).toEqual({
      from: iso(2026, 4, 4, 0, 0, 0, 0), // Mon May 4
      to: iso(2026, 4, 10, 23, 59, 59, 999), // Sun May 10
    })
  })

  it('month → the preceding month', () => {
    expect(previousPeriodRange(month('2026-05-15'))).toEqual({
      from: iso(2026, 3, 1, 0, 0, 0, 0), // Apr 1
      to: iso(2026, 3, 30, 23, 59, 59, 999), // Apr 30
    })
  })

  it('month → previous month of a different length (Mar → Feb)', () => {
    expect(previousPeriodRange(month('2026-03-15'))).toEqual({
      from: iso(2026, 1, 1, 0, 0, 0, 0),
      to: iso(2026, 1, 28, 23, 59, 59, 999),
    })
  })

  it('month → previous month across a year boundary (Jan → Dec)', () => {
    expect(previousPeriodRange(month('2026-01-15'))).toEqual({
      from: iso(2025, 11, 1, 0, 0, 0, 0),
      to: iso(2025, 11, 31, 23, 59, 59, 999),
    })
  })

  it('year → the preceding year', () => {
    expect(previousPeriodRange(year('2026-07-06'))).toEqual({
      from: iso(2025, 0, 1, 0, 0, 0, 0),
      to: iso(2025, 11, 31, 23, 59, 59, 999),
    })
  })

  it('custom → equal-length block ending just before `from`', () => {
    const { from, to } = previousPeriodRange(custom('2026-03-05', '2026-03-20'))
    const curFrom = Date.parse(iso(2026, 2, 5, 0, 0, 0, 0))
    const curTo = Date.parse(iso(2026, 2, 20, 23, 59, 59, 999))
    expect(Date.parse(to)).toBe(curFrom - 1)
    expect(Date.parse(from)).toBe(curFrom - 1 - (curTo - curFrom))
  })
})

describe('periodGranularity', () => {
  it('maps anchored kinds to fixed bucket sizes', () => {
    expect(periodGranularity(day('2026-05-15'))).toBe('hour')
    expect(periodGranularity(week('2026-05-15'))).toBe('day')
    expect(periodGranularity(month('2026-05-15'))).toBe('week')
    expect(periodGranularity(year('2026-05-15'))).toBe('month')
  })

  it('chooses granularity by custom range length', () => {
    expect(periodGranularity(custom('2026-03-05', '2026-03-06'))).toBe('hour') // 2 days
    expect(periodGranularity(custom('2026-03-01', '2026-03-20'))).toBe('day') // ~20 days
    expect(periodGranularity(custom('2026-01-01', '2026-03-01'))).toBe('week') // ~60 days
    expect(periodGranularity(custom('2026-01-01', '2026-12-31'))).toBe('month') // ~365 days
  })

  it('custom boundary lengths: 31 days is still daily, 32 becomes weekly', () => {
    expect(periodGranularity(custom('2026-03-01', '2026-03-31'))).toBe('day') // 31 days
    expect(periodGranularity(custom('2026-03-01', '2026-04-01'))).toBe('week') // 32 days
    expect(periodGranularity(custom('2026-01-01', '2026-04-02'))).toBe('week') // 92 days
    expect(periodGranularity(custom('2026-01-01', '2026-04-03'))).toBe('month') // 93 days
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
