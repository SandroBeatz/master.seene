import type {
  CalendarFirstDay,
  MasterCalendarViewType,
  MasterPreferences,
  MasterProfile,
  MasterSchedule,
  MasterSettings,
  TimeFormat,
} from './types'

export const DEFAULT_TIME_FORMAT: TimeFormat = 24
export const DEFAULT_TIME_ZONE = 'local'
export const DEFAULT_CALENDAR_FIRST_DAY: CalendarFirstDay = 1
export const DEFAULT_CALENDAR_SLOT_STEP_MINUTES = 15
export const DEFAULT_CALENDAR_VIEW: MasterCalendarViewType = 'timeGridWeek'

const MASTER_CALENDAR_VIEW_TYPES: MasterCalendarViewType[] = [
  'dayGridMonth',
  'timeGridWeek',
  'timeGridDay',
]

export function normalizeTimeFormat(value: unknown): TimeFormat {
  return value === 12 || value === '12' ? 12 : DEFAULT_TIME_FORMAT
}

export function normalizeCalendarFirstDay(value: unknown): CalendarFirstDay {
  const day = typeof value === 'string' ? Number(value) : value

  return Number.isInteger(day) && typeof day === 'number' && day >= 0 && day <= 6
    ? (day as CalendarFirstDay)
    : DEFAULT_CALENDAR_FIRST_DAY
}

export function normalizeCalendarSlotStepMinutes(value: unknown): number {
  const minutes = typeof value === 'string' ? Number(value) : value

  return Number.isInteger(minutes) && typeof minutes === 'number' && minutes > 0 && minutes <= 120
    ? minutes
    : DEFAULT_CALENDAR_SLOT_STEP_MINUTES
}

export function normalizeDefaultCalendarView(value: unknown): MasterCalendarViewType {
  return typeof value === 'string' &&
    MASTER_CALENDAR_VIEW_TYPES.includes(value as MasterCalendarViewType)
    ? (value as MasterCalendarViewType)
    : DEFAULT_CALENDAR_VIEW
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
  const calendarFirstDay = normalizeCalendarFirstDay(settings?.calendar_first_day)
  const calendarSlotStepMinutes = normalizeCalendarSlotStepMinutes(
    settings?.calendar_slot_step_minutes,
  )
  const defaultCalendarView = normalizeDefaultCalendarView(settings?.default_calendar_view)

  return {
    profile,
    settings: {
      user_id: settings?.user_id ?? profile?.user_id ?? '',
      time_format: timeFormat,
      calendar_first_day: calendarFirstDay,
      calendar_slot_step_minutes: calendarSlotStepMinutes,
      default_calendar_view: defaultCalendarView,
    },
    timeFormat,
    timeZone: getTimeZoneFromSchedule(profile?.schedule),
    calendarFirstDay,
    calendarSlotStepMinutes,
    defaultCalendarView,
  }
}
