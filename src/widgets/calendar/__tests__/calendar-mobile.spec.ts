import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import {
  getAppointmentDates,
  getMobileCalendarEventDensity,
  getMobileCalendarScrollTime,
  getMobileCalendarSlotHeight,
  getWeekDates,
  getWorkdayStart,
  readStoredMobileCalendarView,
  resolveMobileTimeGridBounds,
  storeMobileCalendarView,
  toMonthAlignedRange,
} from '../model/calendar-mobile'
import { getCalendarDateString } from '../model/calendar-range'

// jsdom in this setup does not expose a real `localStorage` — back it in memory.
function createMemoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
    key: (index) => Array.from(map.keys())[index] ?? null,
  }
}

describe('mobile calendar model', () => {
  vi.stubGlobal('localStorage', createMemoryStorage())
  afterAll(() => vi.unstubAllGlobals())
  afterEach(() => localStorage.clear())

  it('scales slot rows to the master slot step', () => {
    expect(getMobileCalendarSlotHeight(15)).toBe(20)
    expect(getMobileCalendarSlotHeight(30)).toBe(40)
    expect(getMobileCalendarSlotHeight(60)).toBe(80)
  })

  it('picks a card density that fits the event height', () => {
    expect(getMobileCalendarEventDensity(15)).toBe('micro')
    expect(getMobileCalendarEventDensity(30)).toBe('compact')
    expect(getMobileCalendarEventDensity(45)).toBe('full')
    expect(getMobileCalendarEventDensity(120)).toBe('full')
  })

  it('widens the schedule window to whole hours around out-of-hours events', () => {
    const schedule = { slotMinTime: '07:00:00', slotMaxTime: '21:00:00' }

    expect(resolveMobileTimeGridBounds(schedule, [])).toEqual({
      slotMinTime: '07:00:00',
      slotMaxTime: '21:00:00',
    })
    expect(
      resolveMobileTimeGridBounds(schedule, [
        { start: '2026-10-05T06:30:00', end: '2026-10-05T07:15:00' },
        { start: '2026-10-05T21:10:00', end: '2026-10-05T22:20:00' },
        { start: '2026-10-05T00:00:00', end: '2026-10-06T00:00:00', allDay: true },
        { startTime: '13:00:00', endTime: '14:00:00', display: 'background' },
      ]),
    ).toEqual({ slotMinTime: '06:00:00', slotMaxTime: '23:00:00' })
  })

  it('shows the whole day without a schedule and treats a midnight end as 24:00', () => {
    expect(resolveMobileTimeGridBounds({}, [])).toEqual({
      slotMinTime: '00:00:00',
      slotMaxTime: '24:00:00',
    })
    expect(
      resolveMobileTimeGridBounds({ slotMinTime: '08:00:00', slotMaxTime: '20:00:00' }, [
        { start: '2026-10-05T22:00:00', end: '2026-10-06T00:00:00' },
      ]).slotMaxTime,
    ).toBe('24:00:00')
  })

  it('focuses an hour before now, else just before the workday, on whole hours', () => {
    const bounds = { slotMinTime: '07:00:00', slotMaxTime: '22:00:00' }

    expect(getMobileCalendarScrollTime({ bounds, nowMinutes: 14 * 60 + 40 })).toBe('13:00:00')
    expect(getMobileCalendarScrollTime({ bounds, workdayStart: '09:00:00' })).toBe('08:00:00')
    // Clamped: late evening keeps the last hour on screen, early morning the top.
    expect(getMobileCalendarScrollTime({ bounds, nowMinutes: 23 * 60 + 50 })).toBe('21:00:00')
    expect(getMobileCalendarScrollTime({ bounds, nowMinutes: 30 })).toBe('07:00:00')
    expect(getMobileCalendarScrollTime({ bounds })).toBe('07:00:00')
  })

  it('finds the earliest workday start among business hours', () => {
    expect(
      getWorkdayStart([{ startTime: '10:00:00' }, { startTime: '09:00:00' }, { startTime: 1 }]),
    ).toBe('09:00:00')
    expect(getWorkdayStart(undefined)).toBeUndefined()
  })

  it('lists the week of a date from the configured first day', () => {
    expect(getWeekDates('2026-10-08', 1)).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ])
    expect(getWeekDates('2026-10-08', 0)[0]).toBe('2026-10-04')
    expect(getWeekDates('2026-10-04', 1)[0]).toBe('2026-09-28')
  })

  it('collects the dates that hold appointments', () => {
    expect(
      getAppointmentDates([
        { start: '2026-10-05T09:00:00', extendedProps: { type: 'appointment' } },
        { start: '2026-10-05T12:00:00', extendedProps: { type: 'appointment' } },
        { start: '2026-10-06T09:00:00', extendedProps: { type: 'time-block' } },
      ]),
    ).toEqual(new Set(['2026-10-05']))
  })

  it('pads the query window to whole months around the visible range', () => {
    const monday = toMonthAlignedRange({
      from: '2026-10-05T00:00:00.000Z',
      to: '2026-10-06T00:00:00.000Z',
    })
    const friday = toMonthAlignedRange({
      from: '2026-10-09T00:00:00.000Z',
      to: '2026-10-10T00:00:00.000Z',
    })

    expect(monday).toEqual(friday)
    expect(monday).toEqual({ from: '2026-08-31T00:00:00.000Z', to: '2026-12-02T00:00:00.000Z' })
    expect(toMonthAlignedRange({ from: undefined, to: undefined })).toEqual({
      from: undefined,
      to: undefined,
    })
  })

  it('remembers the last view and falls back to month', () => {
    expect(readStoredMobileCalendarView()).toBe('dayGridMonth')
    storeMobileCalendarView('timeGridWeek')
    expect(readStoredMobileCalendarView()).toBe('timeGridWeek')
    localStorage.setItem('seene:mobile-calendar:view', 'agenda')
    expect(readStoredMobileCalendarView()).toBe('dayGridMonth')
  })

  it('reads FullCalendar wall-clock dates in UTC fields for named zones', () => {
    const date = new Date('2026-10-05T09:30:00.000Z')
    expect(getCalendarDateString(date, 'Europe/Paris')).toBe('2026-10-05T09:30:00')
  })
})
