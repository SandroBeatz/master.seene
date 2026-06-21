import type {
  BookingDefaultStatus,
  CalendarFirstDay,
  ClientReminderOffset,
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
export const DEFAULT_ONLINE_BOOKING_ENABLED = false
export const DEFAULT_BOOKING_STATUS: BookingDefaultStatus = 'pending'
export const DEFAULT_BOOKING_BUFFER_MINUTES = 0
export const DEFAULT_BOOKING_MIN_NOTICE_MINUTES = 0
/** Matches the CHECK constraint on master_settings.booking_buffer_minutes. */
export const MAX_BOOKING_BUFFER_MINUTES = 240

// Notification defaults — mirror the column defaults in
// 20260621161508_add_notification_settings_to_master_settings.sql.
export const DEFAULT_CLIENT_REMINDER_WHATSAPP_ENABLED = false
/** Allowed "when to remind" offsets (minutes before appointment): 24h, 2h, 1h. */
export const CLIENT_REMINDER_OFFSET_VALUES: ClientReminderOffset[] = [1440, 120, 60]
export const DEFAULT_CLIENT_REMINDER_OFFSETS: number[] = [1440, 120]
export const DEFAULT_ALERT_NEW_BOOKING_ENABLED = true
export const DEFAULT_ALERT_AWAITING_CONFIRMATION_ENABLED = true
export const DEFAULT_ALERT_CANCELLATION_ENABLED = true
export const DEFAULT_ALERT_UPCOMING_APPOINTMENT_ENABLED = false
export const DEFAULT_ALERT_UPCOMING_OFFSET_MINUTES = 60

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

export function normalizeOnlineBookingEnabled(value: unknown): boolean {
  return value === true
}

export function normalizeBookingDefaultStatus(value: unknown): BookingDefaultStatus {
  return value === 'confirmed' ? 'confirmed' : DEFAULT_BOOKING_STATUS
}

export function normalizeBookingBufferMinutes(value: unknown): number {
  const minutes = typeof value === 'string' ? Number(value) : value

  return Number.isInteger(minutes) &&
    typeof minutes === 'number' &&
    minutes >= 0 &&
    minutes <= MAX_BOOKING_BUFFER_MINUTES
    ? minutes
    : DEFAULT_BOOKING_BUFFER_MINUTES
}

export function normalizeBookingMinNoticeMinutes(value: unknown): number {
  const minutes = typeof value === 'string' ? Number(value) : value

  return Number.isInteger(minutes) && typeof minutes === 'number' && minutes >= 0
    ? minutes
    : DEFAULT_BOOKING_MIN_NOTICE_MINUTES
}

export function normalizeBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/**
 * Keeps only the supported reminder offsets (24h/2h/1h), drops duplicates and
 * preserves a stable order (largest first). Any non-array or all-invalid input
 * falls back to the default set.
 */
export function normalizeClientReminderOffsets(value: unknown): number[] {
  if (!Array.isArray(value)) return [...DEFAULT_CLIENT_REMINDER_OFFSETS]

  const seen = new Set<number>()
  for (const item of value) {
    const minutes = typeof item === 'string' ? Number(item) : item
    if (
      typeof minutes === 'number' &&
      CLIENT_REMINDER_OFFSET_VALUES.includes(minutes as ClientReminderOffset)
    ) {
      seen.add(minutes)
    }
  }

  // An empty selection is a valid, intentional state ("remind via WhatsApp but
  // pick the timing later") — only an entirely invalid input falls back.
  if (value.length > 0 && seen.size === 0) return [...DEFAULT_CLIENT_REMINDER_OFFSETS]

  return CLIENT_REMINDER_OFFSET_VALUES.filter((offset) => seen.has(offset))
}

export function normalizeAlertUpcomingOffsetMinutes(value: unknown): number {
  const minutes = typeof value === 'string' ? Number(value) : value

  return Number.isInteger(minutes) && typeof minutes === 'number' && minutes >= 0
    ? minutes
    : DEFAULT_ALERT_UPCOMING_OFFSET_MINUTES
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
  const onlineBookingEnabled = normalizeOnlineBookingEnabled(settings?.online_booking_enabled)
  const bookingDefaultStatus = normalizeBookingDefaultStatus(settings?.booking_default_status)
  const bookingBufferMinutes = normalizeBookingBufferMinutes(settings?.booking_buffer_minutes)
  const bookingMinNoticeMinutes = normalizeBookingMinNoticeMinutes(
    settings?.booking_min_notice_minutes,
  )
  const clientReminderWhatsappEnabled = normalizeBool(
    settings?.client_reminder_whatsapp_enabled,
    DEFAULT_CLIENT_REMINDER_WHATSAPP_ENABLED,
  )
  const clientReminderOffsetsMinutes = normalizeClientReminderOffsets(
    settings?.client_reminder_offsets_minutes,
  )
  const alertNewBookingEnabled = normalizeBool(
    settings?.alert_new_booking_enabled,
    DEFAULT_ALERT_NEW_BOOKING_ENABLED,
  )
  const alertAwaitingConfirmationEnabled = normalizeBool(
    settings?.alert_awaiting_confirmation_enabled,
    DEFAULT_ALERT_AWAITING_CONFIRMATION_ENABLED,
  )
  const alertCancellationEnabled = normalizeBool(
    settings?.alert_cancellation_enabled,
    DEFAULT_ALERT_CANCELLATION_ENABLED,
  )
  const alertUpcomingAppointmentEnabled = normalizeBool(
    settings?.alert_upcoming_appointment_enabled,
    DEFAULT_ALERT_UPCOMING_APPOINTMENT_ENABLED,
  )
  const alertUpcomingOffsetMinutes = normalizeAlertUpcomingOffsetMinutes(
    settings?.alert_upcoming_offset_minutes,
  )

  return {
    profile,
    settings: {
      user_id: settings?.user_id ?? profile?.user_id ?? '',
      time_format: timeFormat,
      calendar_first_day: calendarFirstDay,
      calendar_slot_step_minutes: calendarSlotStepMinutes,
      default_calendar_view: defaultCalendarView,
      online_booking_enabled: onlineBookingEnabled,
      booking_default_status: bookingDefaultStatus,
      booking_buffer_minutes: bookingBufferMinutes,
      booking_min_notice_minutes: bookingMinNoticeMinutes,
      client_reminder_whatsapp_enabled: clientReminderWhatsappEnabled,
      client_reminder_offsets_minutes: clientReminderOffsetsMinutes,
      alert_new_booking_enabled: alertNewBookingEnabled,
      alert_awaiting_confirmation_enabled: alertAwaitingConfirmationEnabled,
      alert_cancellation_enabled: alertCancellationEnabled,
      alert_upcoming_appointment_enabled: alertUpcomingAppointmentEnabled,
      alert_upcoming_offset_minutes: alertUpcomingOffsetMinutes,
    },
    timeFormat,
    timeZone: getTimeZoneFromSchedule(profile?.schedule),
    calendarFirstDay,
    calendarSlotStepMinutes,
    defaultCalendarView,
    onlineBookingEnabled,
    bookingDefaultStatus,
    bookingBufferMinutes,
    bookingMinNoticeMinutes,
    clientReminderWhatsappEnabled,
    clientReminderOffsetsMinutes,
    alertNewBookingEnabled,
    alertAwaitingConfirmationEnabled,
    alertCancellationEnabled,
    alertUpcomingAppointmentEnabled,
    alertUpcomingOffsetMinutes,
  }
}
