import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CALENDAR_FIRST_DAY,
  DEFAULT_CALENDAR_SLOT_STEP_MINUTES,
  DEFAULT_CALENDAR_VIEW,
  DEFAULT_TIME_FORMAT,
  createMasterPreferences,
  getTimeZoneFromSchedule,
  normalizeCalendarFirstDay,
  normalizeCalendarSlotStepMinutes,
  normalizeDefaultCalendarView,
  normalizeTimeFormat,
} from '../model/master-preferences'

describe('master preferences helpers', () => {
  it('normalizes unsupported time formats to the 24h default', () => {
    expect(normalizeTimeFormat(12)).toBe(12)
    expect(normalizeTimeFormat('12')).toBe(12)
    expect(normalizeTimeFormat(24)).toBe(DEFAULT_TIME_FORMAT)
    expect(normalizeTimeFormat(null)).toBe(DEFAULT_TIME_FORMAT)
  })

  it('extracts timezone from profile schedule with fallback', () => {
    expect(getTimeZoneFromSchedule({ timezone: 'Europe/Paris' }, 'UTC')).toBe('Europe/Paris')
    expect(getTimeZoneFromSchedule({ timezone: '' }, 'UTC')).toBe('UTC')
    expect(getTimeZoneFromSchedule(null, 'UTC')).toBe('UTC')
  })

  it('normalizes calendar settings with safe defaults', () => {
    expect(normalizeCalendarFirstDay(0)).toBe(0)
    expect(normalizeCalendarFirstDay('6')).toBe(6)
    expect(normalizeCalendarFirstDay(7)).toBe(DEFAULT_CALENDAR_FIRST_DAY)
    expect(normalizeCalendarSlotStepMinutes(30)).toBe(30)
    expect(normalizeCalendarSlotStepMinutes('45')).toBe(45)
    expect(normalizeCalendarSlotStepMinutes(0)).toBe(DEFAULT_CALENDAR_SLOT_STEP_MINUTES)
    expect(normalizeDefaultCalendarView('timeGridDay')).toBe('timeGridDay')
    expect(normalizeDefaultCalendarView('listWeek')).toBe(DEFAULT_CALENDAR_VIEW)
  })

  it('creates default settings when master_settings is missing', () => {
    const preferences = createMasterPreferences(
      {
        id: 'profile-1',
        user_id: 'user-1',
        schedule: { timezone: 'Asia/Bishkek' },
      },
      null,
    )

    expect(preferences.settings).toEqual({
      user_id: 'user-1',
      time_format: 24,
      calendar_first_day: 1,
      calendar_slot_step_minutes: 15,
      default_calendar_view: 'timeGridWeek',
    })
    expect(preferences.timeFormat).toBe(24)
    expect(preferences.timeZone).toBe('Asia/Bishkek')
    expect(preferences.calendarFirstDay).toBe(1)
    expect(preferences.calendarSlotStepMinutes).toBe(15)
    expect(preferences.defaultCalendarView).toBe('timeGridWeek')
  })

  it('uses saved calendar settings when master_settings exists', () => {
    const preferences = createMasterPreferences(null, {
      user_id: 'user-1',
      time_format: 12,
      calendar_first_day: 0,
      calendar_slot_step_minutes: 30,
      default_calendar_view: 'timeGridDay',
    })

    expect(preferences.settings).toEqual({
      user_id: 'user-1',
      time_format: 12,
      calendar_first_day: 0,
      calendar_slot_step_minutes: 30,
      default_calendar_view: 'timeGridDay',
    })
    expect(preferences.timeFormat).toBe(12)
    expect(preferences.calendarFirstDay).toBe(0)
    expect(preferences.calendarSlotStepMinutes).toBe(30)
    expect(preferences.defaultCalendarView).toBe('timeGridDay')
  })
})
