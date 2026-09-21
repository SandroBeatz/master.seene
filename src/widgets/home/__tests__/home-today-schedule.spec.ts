import { describe, expect, it } from 'vitest'
import type { Appointment } from '@entities/appointment'
import type { MasterSchedule } from '@entities/master'
import type { TimeBlock } from '@entities/time-block'
import {
  appointmentMinuteInterval,
  createTodayScheduleRange,
  timeBlockMinuteInterval,
  workingHoursForDate,
} from '../model/home-today-schedule'

describe('home today schedule model', () => {
  it('builds the current calendar-day range in the master timezone', () => {
    const range = createTodayScheduleRange(new Date('2026-09-20T20:30:00.000Z'), 'Asia/Bishkek')

    expect(range).toEqual({
      date: '2026-09-21',
      from: '2026-09-20T18:00:00.000Z',
      to: '2026-09-21T17:59:59.999Z',
    })
  })

  it('keeps daylight-saving day boundaries instead of assuming 24 hours', () => {
    const range = createTodayScheduleRange(new Date('2026-03-08T16:00:00.000Z'), 'America/New_York')

    expect(range.date).toBe('2026-03-08')
    expect(range.from).toBe('2026-03-08T05:00:00.000Z')
    expect(range.to).toBe('2026-03-09T03:59:59.999Z')
  })

  it('resolves working hours by the calendar weekday, independent of browser timezone', () => {
    const schedule: MasterSchedule = {
      days: {
        monday: { enabled: true, start: '09:30', end: '18:15', breaks: [] },
      },
    }

    expect(workingHoursForDate(schedule, '2026-09-21')).toEqual({ from: 570, to: 1095 })
    expect(workingHoursForDate(schedule, '2026-09-22')).toBeNull()
  })

  it('clamps an appointment that crosses midnight to the current day', () => {
    const appointment = {
      start_at: '2026-09-21T23:30:00.000Z',
      duration: 120,
    } as Appointment

    expect(appointmentMinuteInterval(appointment, '2026-09-21', 'UTC')).toEqual({
      from: 1410,
      to: 1440,
    })
  })

  it('projects a multi-day time off onto the requested day', () => {
    const block = {
      start_at: '2026-09-20T10:00:00.000Z',
      end_at: '2026-09-22T10:00:00.000Z',
    } as TimeBlock

    expect(timeBlockMinuteInterval(block, '2026-09-21', 'UTC')).toEqual({
      from: 0,
      to: 1440,
    })
  })
})
