import { describe, expect, it } from 'vitest'
import type { MasterSchedule } from '@entities/master'
import {
  buildCalendarScheduleDisplay,
  isCalendarScheduleBreakSlot,
} from '../model/calendar-schedule'

const baseSchedule: MasterSchedule = {
  timezone: 'Asia/Bishkek',
  days: {
    monday: {
      enabled: true,
      start: '09:00',
      end: '18:00',
      breaks: [],
    },
    tuesday: {
      enabled: true,
      start: '10:30',
      end: '17:00',
      breaks: [],
    },
  },
}

describe('buildCalendarScheduleDisplay', () => {
  it('pads visible calendar hours by two hours around the workday range', () => {
    const display = buildCalendarScheduleDisplay(baseSchedule)

    expect(display.slotMinTime).toBe('07:00:00')
    expect(display.slotMaxTime).toBe('20:00:00')
  })

  it('clamps visible calendar hours to the current day boundaries', () => {
    const display = buildCalendarScheduleDisplay({
      days: {
        monday: {
          enabled: true,
          start: '01:00',
          end: '23:00',
          breaks: [],
        },
      },
    })

    expect(display.slotMinTime).toBe('00:00:00')
    expect(display.slotMaxTime).toBe('24:00:00')
  })

  it('creates FullCalendar business hours for enabled days only', () => {
    const display = buildCalendarScheduleDisplay({
      days: {
        monday: {
          enabled: true,
          start: '09:00',
          end: '18:00',
          breaks: [],
        },
        wednesday: {
          enabled: false,
          start: '09:00',
          end: '18:00',
          breaks: [],
        },
      },
    })

    expect(display.businessHours).toEqual([
      {
        daysOfWeek: [1],
        startTime: '09:00:00',
        endTime: '18:00:00',
      },
    ])
  })

  it('creates recurring background events for breaks inside working hours', () => {
    const display = buildCalendarScheduleDisplay({
      days: {
        monday: {
          enabled: true,
          start: '09:00',
          end: '18:00',
          breaks: [
            { start: '12:00', end: '13:00' },
            { start: '17:30', end: '19:00' },
          ],
        },
      },
    })

    expect(display.backgroundEvents).toMatchObject([
      {
        daysOfWeek: [1],
        startTime: '12:00:00',
        endTime: '13:00:00',
        display: 'background',
        classNames: ['fc-schedule-break'],
      },
      {
        daysOfWeek: [1],
        startTime: '17:30:00',
        endTime: '18:00:00',
        display: 'background',
        classNames: ['fc-schedule-break'],
      },
    ])
  })

  it('falls back without schedule options when schedule is missing or invalid', () => {
    expect(buildCalendarScheduleDisplay(null)).toEqual({ backgroundEvents: [] })
    expect(
      buildCalendarScheduleDisplay({
        days: {
          monday: {
            enabled: true,
            start: '18:00',
            end: '09:00',
            breaks: [],
          },
        },
      }),
    ).toEqual({ backgroundEvents: [] })
  })
})

describe('isCalendarScheduleBreakSlot', () => {
  it('detects slots inside recurring schedule breaks', () => {
    const schedule: MasterSchedule = {
      days: {
        monday: {
          enabled: true,
          start: '09:00',
          end: '18:00',
          breaks: [{ start: '12:00', end: '13:00' }],
        },
      },
    }

    expect(isCalendarScheduleBreakSlot(schedule, 1, 12 * 60)).toBe(true)
    expect(isCalendarScheduleBreakSlot(schedule, 1, 12 * 60 + 30)).toBe(true)
    expect(isCalendarScheduleBreakSlot(schedule, 1, 13 * 60)).toBe(false)
    expect(isCalendarScheduleBreakSlot(schedule, 2, 12 * 60)).toBe(false)
  })
})
