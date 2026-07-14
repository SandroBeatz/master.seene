import { describe, expect, it } from 'vitest'
import type { MasterSchedule } from '@entities/master'
import { classifyDayState } from '../model/classify-day-state'

// 2026-07-06 is a Monday, 2026-07-05 is a Sunday.
const MONDAY = '2026-07-06'
const SUNDAY = '2026-07-05'

describe('classifyDayState', () => {
  it('returns "day-off" for a day the master does not work', () => {
    // Sunday is off in the default schedule.
    expect(
      classifyDayState({
        schedule: null,
        date: SUNDAY,
        busy: [],
        stepMinutes: 30,
        durationMinutes: 60,
      }),
    ).toBe('day-off')
  })

  it('returns "available" for a working day with a fitting free slot', () => {
    expect(
      classifyDayState({
        schedule: null,
        date: MONDAY,
        busy: [],
        stepMinutes: 30,
        durationMinutes: 60,
      }),
    ).toBe('available')
  })

  it('returns "full" for a working day fully covered by busy intervals', () => {
    // Default window 10:00–19:00 (600–1140) entirely busy.
    expect(
      classifyDayState({
        schedule: null,
        date: MONDAY,
        busy: [[600, 1140]],
        stepMinutes: 30,
        durationMinutes: 60,
      }),
    ).toBe('full')
  })

  it('excludes past times when `nowMinutes` is given (today)', () => {
    // Today, "now" is 18:30 (1110); a 60-min service no longer fits before 19:00.
    expect(
      classifyDayState({
        schedule: null,
        date: MONDAY,
        busy: [],
        stepMinutes: 30,
        durationMinutes: 60,
        nowMinutes: 1110,
      }),
    ).toBe('full')
  })

  it('ignores `nowMinutes` effect when the day still has later slots', () => {
    // "now" 10:15 → next grid slot 10:30, plenty of room for 60 min.
    expect(
      classifyDayState({
        schedule: null,
        date: MONDAY,
        busy: [],
        stepMinutes: 30,
        durationMinutes: 60,
        nowMinutes: 615,
      }),
    ).toBe('available')
  })

  it('respects a custom schedule with breaks', () => {
    const schedule: MasterSchedule = {
      timezone: null,
      days: {
        monday: {
          enabled: true,
          start: '09:00',
          end: '10:00',
          breaks: [{ start: '09:00', end: '10:00' }],
        },
      },
    }
    // The only working hour is entirely a break → no slot fits.
    expect(
      classifyDayState({ schedule, date: MONDAY, busy: [], stepMinutes: 30, durationMinutes: 30 }),
    ).toBe('full')
  })
})
