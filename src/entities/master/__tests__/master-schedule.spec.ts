import { describe, expect, it } from 'vitest'
import {
  DAY_ORDER,
  DEFAULT_DAY_END,
  DEFAULT_DAY_START,
  createDefaultSchedule,
  isValidHHmm,
  normalizeSchedule,
  toMinutes,
  validateSchedule,
  validateScheduleDay,
} from '../model/master-schedule'
import type { NormalizedScheduleDay } from '../model/master-schedule'

function day(overrides: Partial<NormalizedScheduleDay> = {}): NormalizedScheduleDay {
  return { enabled: true, start: '10:00', end: '19:00', breaks: [], ...overrides }
}

describe('time helpers', () => {
  it('validates HH:mm strings', () => {
    expect(isValidHHmm('00:00')).toBe(true)
    expect(isValidHHmm('23:59')).toBe(true)
    expect(isValidHHmm('9:00')).toBe(false)
    expect(isValidHHmm('24:00')).toBe(false)
    expect(isValidHHmm('10:60')).toBe(false)
    expect(isValidHHmm(null)).toBe(false)
  })

  it('converts HH:mm to minutes since midnight', () => {
    expect(toMinutes('00:00')).toBe(0)
    expect(toMinutes('10:30')).toBe(630)
    expect(toMinutes('23:59')).toBe(1439)
    expect(Number.isNaN(toMinutes('bad'))).toBe(true)
  })
})

describe('createDefaultSchedule', () => {
  it('enables Mon–Fri 10:00–19:00 and turns weekends off', () => {
    const schedule = createDefaultSchedule()
    const days = schedule.days!

    for (const key of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const) {
      expect(days[key]).toMatchObject({
        enabled: true,
        start: DEFAULT_DAY_START,
        end: DEFAULT_DAY_END,
        breaks: [],
      })
    }
    expect(days.saturday).toMatchObject({ enabled: false })
    expect(days.sunday).toMatchObject({ enabled: false })
  })
})

describe('normalizeSchedule', () => {
  it('fills all seven days when given null', () => {
    const normalized = normalizeSchedule(null)
    expect(Object.keys(normalized.days).sort()).toEqual([...DAY_ORDER].sort())
    expect(normalized.timezone).toBeNull()
  })

  it('coerces malformed times to defaults and keeps valid ones', () => {
    const normalized = normalizeSchedule({
      days: {
        monday: { enabled: true, start: '08:30', end: 'oops', breaks: [] },
      },
    })

    expect(normalized.days.monday).toMatchObject({
      enabled: true,
      start: '08:30',
      end: DEFAULT_DAY_END,
    })
  })

  it('filters invalid breaks and sorts the rest by start time', () => {
    const normalized = normalizeSchedule({
      days: {
        monday: {
          enabled: true,
          start: '08:00',
          end: '20:00',
          breaks: [
            { start: '15:00', end: '15:30' },
            { start: 'bad', end: '12:00' },
            { start: '12:00', end: '13:00' },
          ],
        },
      },
    })

    expect(normalized.days.monday.breaks).toEqual([
      { start: '12:00', end: '13:00' },
      { start: '15:00', end: '15:30' },
    ])
  })

  it('preserves the timezone string when present', () => {
    expect(normalizeSchedule({ timezone: 'Europe/Paris' }).timezone).toBe('Europe/Paris')
    expect(normalizeSchedule({ timezone: '  ' }).timezone).toBeNull()
  })
})

describe('validateScheduleDay', () => {
  it('treats a disabled day as always valid', () => {
    expect(validateScheduleDay(day({ enabled: false, start: '20:00', end: '08:00' }))).toEqual([])
  })

  it('accepts a well-formed day', () => {
    expect(validateScheduleDay(day({ breaks: [{ start: '12:00', end: '13:00' }] }))).toEqual([])
  })

  it('flags end before start', () => {
    expect(validateScheduleDay(day({ start: '19:00', end: '10:00' }))).toEqual([
      { code: 'endBeforeStart' },
    ])
  })

  it('flags a break whose end is before its start', () => {
    expect(validateScheduleDay(day({ breaks: [{ start: '14:00', end: '13:00' }] }))).toEqual([
      { code: 'breakEndBeforeStart', breakIndex: 0 },
    ])
  })

  it('flags a break outside working hours', () => {
    expect(
      validateScheduleDay(
        day({ start: '10:00', end: '18:00', breaks: [{ start: '18:30', end: '19:00' }] }),
      ),
    ).toEqual([{ code: 'breakOutsideHours', breakIndex: 0 }])
  })

  it('flags overlapping breaks', () => {
    const errors = validateScheduleDay(
      day({
        start: '08:00',
        end: '20:00',
        breaks: [
          { start: '12:00', end: '13:00' },
          { start: '12:30', end: '14:00' },
        ],
      }),
    )
    expect(errors).toContainEqual({ code: 'breaksOverlap', breakIndex: 1 })
  })
})

describe('validateSchedule', () => {
  it('reports ok when every enabled day is valid', () => {
    const result = validateSchedule(normalizeSchedule(createDefaultSchedule()))
    expect(result.ok).toBe(true)
  })

  it('reports not ok and surfaces the offending day', () => {
    const schedule = normalizeSchedule(createDefaultSchedule())
    schedule.days.monday = day({ start: '19:00', end: '10:00' })
    const result = validateSchedule(schedule)

    expect(result.ok).toBe(false)
    expect(result.days.monday).toEqual([{ code: 'endBeforeStart' }])
    expect(result.days.tuesday).toEqual([])
  })
})
