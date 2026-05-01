import type {
  MasterPreferences,
  MasterProfile,
  MasterSchedule,
  MasterSettings,
  TimeFormat,
} from './types'

export const DEFAULT_TIME_FORMAT: TimeFormat = 24
export const DEFAULT_TIME_ZONE = 'local'

export function normalizeTimeFormat(value: unknown): TimeFormat {
  return value === 12 || value === '12' ? 12 : DEFAULT_TIME_FORMAT
}

export function getDefaultTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_ZONE
  } catch {
    return DEFAULT_TIME_ZONE
  }
}

export function getTimeZoneFromSchedule(
  schedule: MasterSchedule | null | undefined,
  fallback = getDefaultTimeZone(),
): string {
  const timezone = schedule?.timezone
  return typeof timezone === 'string' && timezone.trim() ? timezone : fallback
}

export function createMasterPreferences(
  profile: MasterProfile | null,
  settings: Partial<MasterSettings> | null,
): MasterPreferences {
  const timeFormat = normalizeTimeFormat(settings?.time_format)

  return {
    profile,
    settings: {
      user_id: settings?.user_id ?? profile?.user_id ?? '',
      time_format: timeFormat,
    },
    timeFormat,
    timeZone: getTimeZoneFromSchedule(profile?.schedule),
  }
}
