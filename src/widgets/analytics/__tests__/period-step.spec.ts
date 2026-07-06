import { describe, expect, it } from 'vitest'
import { CalendarDate } from '@internationalized/date'
import {
  canStepForward,
  fromCalendarDate,
  matchPreset,
  mondayOf,
  presetRange,
  rangeDays,
  resolveRange,
  shiftRange,
  stepPeriod,
} from '../model/period-step'

// Thu Jul 2, 2026 — a fixed "today" so tests don't depend on the wall clock.
const T0 = new CalendarDate(2026, 7, 2)

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

describe('presetRange', () => {
  it('this_week spans Monday..Sunday around today', () => {
    const r = presetRange('this_week', T0)
    expect(fromCalendarDate(r.start)).toBe('2026-06-29')
    expect(fromCalendarDate(r.end)).toBe('2026-07-05')
  })

  it('last_month is the full previous calendar month', () => {
    const r = presetRange('last_month', T0)
    expect(fromCalendarDate(r.start)).toBe('2026-06-01')
    expect(fromCalendarDate(r.end)).toBe('2026-06-30')
  })
})

describe('shiftRange', () => {
  it('steps a full calendar month by month, not by day count', () => {
    const july = { start: new CalendarDate(2026, 7, 1), end: new CalendarDate(2026, 7, 31) }
    const prev = shiftRange(july, -1)
    expect(fromCalendarDate(prev.start)).toBe('2026-06-01')
    expect(fromCalendarDate(prev.end)).toBe('2026-06-30')
  })

  it('handles February when stepping from March', () => {
    const march = { start: new CalendarDate(2026, 3, 1), end: new CalendarDate(2026, 3, 31) }
    const prev = shiftRange(march, -1)
    expect(fromCalendarDate(prev.start)).toBe('2026-02-01')
    expect(fromCalendarDate(prev.end)).toBe('2026-02-28')
  })

  it('steps a week range by exactly 7 days', () => {
    const week = { start: new CalendarDate(2026, 6, 29), end: new CalendarDate(2026, 7, 5) }
    const prev = shiftRange(week, -1)
    expect(fromCalendarDate(prev.start)).toBe('2026-06-22')
    expect(fromCalendarDate(prev.end)).toBe('2026-06-28')
  })

  it('steps an arbitrary range by its own length', () => {
    const r = { start: new CalendarDate(2026, 6, 10), end: new CalendarDate(2026, 6, 19) } // 10 days
    const prev = shiftRange(r, -1)
    expect(fromCalendarDate(prev.start)).toBe('2026-05-31')
    expect(fromCalendarDate(prev.end)).toBe('2026-06-09')
  })

  it('is symmetric: stepping back then forward returns the original range', () => {
    const r = { start: new CalendarDate(2026, 6, 10), end: new CalendarDate(2026, 6, 19) }
    const roundTrip = shiftRange(shiftRange(r, -1), 1)
    expect(fromCalendarDate(roundTrip.start)).toBe('2026-06-10')
    expect(fromCalendarDate(roundTrip.end)).toBe('2026-06-19')
  })
})

describe('rangeDays', () => {
  it('counts inclusive days', () => {
    expect(rangeDays({ start: T0, end: T0 })).toBe(1)
    expect(
      rangeDays({ start: new CalendarDate(2026, 6, 29), end: new CalendarDate(2026, 7, 5) }),
    ).toBe(7)
  })
})

describe('stepPeriod', () => {
  it('this_month → back collapses to the last_month preset', () => {
    expect(stepPeriod('this_month', -1, T0)).toBe('last_month')
  })

  it('last_month → forward collapses to this_month', () => {
    expect(stepPeriod('last_month', 1, T0)).toBe('this_month')
  })

  it('last_month → back becomes a custom full-month range', () => {
    expect(stepPeriod('last_month', -1, T0)).toEqual({
      kind: 'custom',
      range: { from: '2026-05-01', to: '2026-05-31' },
    })
  })

  it('today → back becomes a custom single day (yesterday)', () => {
    expect(stepPeriod('today', -1, T0)).toEqual({
      kind: 'custom',
      range: { from: '2026-07-01', to: '2026-07-01' },
    })
  })

  it('this_week → back collapses to last_week', () => {
    expect(stepPeriod('this_week', -1, T0)).toBe('last_week')
  })

  it('a custom week range stepping forward can collapse to a preset', () => {
    const twoWeeksAgo = {
      kind: 'custom' as const,
      range: { from: '2026-06-15', to: '2026-06-21' },
    }
    expect(stepPeriod(twoWeeksAgo, 1, T0)).toBe('last_week')
  })
})

describe('canStepForward', () => {
  it('blocks stepping into the future from current periods', () => {
    expect(canStepForward('this_month', T0)).toBe(false)
    expect(canStepForward('this_week', T0)).toBe(false)
    expect(canStepForward('today', T0)).toBe(false)
  })

  it('allows stepping forward from past periods', () => {
    expect(canStepForward('last_month', T0)).toBe(true)
    expect(canStepForward('last_week', T0)).toBe(true)
  })
})

describe('matchPreset / resolveRange', () => {
  it('recognises the resolved range of every preset', () => {
    for (const preset of ['today', 'this_week', 'this_month', 'last_week', 'last_month'] as const) {
      expect(matchPreset(resolveRange(preset, T0), T0)).toBe(preset)
    }
  })

  it('returns null for a non-preset range', () => {
    const r = { start: new CalendarDate(2026, 6, 10), end: new CalendarDate(2026, 6, 19) }
    expect(matchPreset(r, T0)).toBeNull()
  })
})
