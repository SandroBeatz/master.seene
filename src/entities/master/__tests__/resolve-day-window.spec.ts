import { describe, expect, it } from 'vitest'
import type { MasterSchedule } from '@entities/master'
import { resolveDayWindow } from '../model/resolve-day-window'

describe('resolveDayWindow', () => {
  it('uses the default window (10:00–19:00) for a weekday with no saved schedule', () => {
    // 2026-07-08 is a Wednesday — enabled by default.
    expect(resolveDayWindow(null, '2026-07-08')).toEqual({
      enabled: true,
      workStart: 600,
      workEnd: 1140,
      breaks: [],
    })
  })

  it('is disabled on a default day off', () => {
    // 2026-07-05 is a Sunday — off by default.
    expect(resolveDayWindow(null, '2026-07-05')).toEqual({
      enabled: false,
      workStart: 0,
      workEnd: 0,
      breaks: [],
    })
  })

  it('resolves a custom day with breaks to minutes', () => {
    const schedule: MasterSchedule = {
      timezone: null,
      days: {
        monday: {
          enabled: true,
          start: '09:00',
          end: '17:00',
          breaks: [{ start: '12:00', end: '13:00' }],
        },
      },
    }
    // 2026-07-06 is a Monday.
    expect(resolveDayWindow(schedule, '2026-07-06')).toEqual({
      enabled: true,
      workStart: 540,
      workEnd: 1020,
      breaks: [[720, 780]],
    })
  })

  it('is disabled for an unparseable date', () => {
    expect(resolveDayWindow(null, '')).toEqual({
      enabled: false,
      workStart: 0,
      workEnd: 0,
      breaks: [],
    })
  })
})
