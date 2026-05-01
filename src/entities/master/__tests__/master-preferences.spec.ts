import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TIME_FORMAT,
  createMasterPreferences,
  getTimeZoneFromSchedule,
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

  it('creates default settings when master_settings is missing', () => {
    const preferences = createMasterPreferences(
      {
        id: 'profile-1',
        user_id: 'user-1',
        schedule: { timezone: 'Asia/Bishkek' },
      },
      null,
    )

    expect(preferences.settings).toEqual({ user_id: 'user-1', time_format: 24 })
    expect(preferences.timeFormat).toBe(24)
    expect(preferences.timeZone).toBe('Asia/Bishkek')
  })
})
