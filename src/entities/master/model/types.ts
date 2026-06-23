export type TimeFormat = 12 | 24
export type CalendarFirstDay = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type MasterCalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'

/** Persisted interface language (Settings → System & region). */
export type AppLanguage = 'en' | 'fr' | 'ru'

/** Persisted color-scheme preference (Settings → System & region). */
export type ThemePreference = 'auto' | 'light' | 'dark'

/**
 * Status applied to a new online booking.
 *   'confirmed' = auto-confirmed (lands straight in the calendar)
 *   'pending'   = needs the master's confirmation first
 * Mirrors the matching values of `AppointmentStatus` in the appointment entity.
 */
export type BookingDefaultStatus = 'pending' | 'confirmed'

/**
 * Allowed "when to remind" offsets for client reminders, in minutes before the
 * appointment. Mirrors the fixed checkbox set in the Notifications form
 * (24h / 2h / 1h) and the CHECK on master_settings.client_reminder_offsets_minutes.
 */
export type ClientReminderOffset = 1440 | 120 | 60

export type MasterScheduleDayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface MasterScheduleBreak {
  start: string
  end: string
}

export interface MasterScheduleDay {
  enabled: boolean
  start: string | null
  end: string | null
  breaks: MasterScheduleBreak[]
}

export interface MasterSchedule {
  timezone?: string | null
  days?: Partial<Record<MasterScheduleDayKey, Partial<MasterScheduleDay> | null>> | null
}

export interface MasterProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  username: string
  specializations: string[]
  bio: string | null
  // Public URL of the avatar in the `avatars` storage bucket. null = no avatar.
  avatar_url: string | null
  schedule: MasterSchedule | null
  // Contact & social channels (Settings → Contacts & social).
  phone: string
  whatsapp: string | null
  telegram: string | null
  instagram: string | null
  tiktok: string | null
  contact_email: string | null
  // Studio / address.
  country: string
  address: string | null
  house_number: string | null
  zip_code: string | null
  city: string | null
  place_id: string | null
  works_at_place: boolean
  can_travel: boolean
}

/** Fields editable from the Profile settings form. */
export interface MasterProfileUpdate {
  first_name: string
  last_name: string
  username: string
  specializations: string[]
  bio: string | null
}

/** Fields editable from the Contacts & social settings form. */
export interface MasterContactsUpdate {
  phone: string
  whatsapp: string | null
  telegram: string | null
  instagram: string | null
  tiktok: string | null
  contact_email: string | null
  country: string
  address: string | null
  house_number: string | null
  zip_code: string | null
  city: string | null
  place_id: string | null
  works_at_place: boolean
  can_travel: boolean
}

export interface MasterSettings {
  user_id: string
  time_format: TimeFormat
  calendar_first_day: CalendarFirstDay
  calendar_slot_step_minutes: number
  default_calendar_view: MasterCalendarViewType
  // System & region (Settings → System & region).
  language: AppLanguage
  theme: ThemePreference
  currency: string
  date_format: string
  // Online booking (Settings → Booking).
  online_booking_enabled: boolean
  booking_default_status: BookingDefaultStatus
  booking_buffer_minutes: number
  booking_min_notice_minutes: number
  // Notifications (Settings → Notifications).
  // Client reminders — outbound reminders to the client about their appointment.
  client_reminder_whatsapp_enabled: boolean
  client_reminder_offsets_minutes: number[]
  // Master alerts — in-app/web heads-up for the master.
  alert_new_booking_enabled: boolean
  alert_awaiting_confirmation_enabled: boolean
  alert_cancellation_enabled: boolean
  alert_upcoming_appointment_enabled: boolean
  alert_upcoming_offset_minutes: number
}

/** Fields editable from the Booking settings form. */
export interface MasterBookingSettingsUpdate {
  online_booking_enabled: boolean
  booking_default_status: BookingDefaultStatus
  booking_buffer_minutes: number
  booking_min_notice_minutes: number
}

/**
 * Fields editable from the System & region settings form. Note: `timezone` is
 * intentionally NOT here — it lives in profile.schedule.timezone (single source
 * of truth, shared with Working Hours) and is saved via the schedule mutation.
 */
export interface MasterSystemSettingsUpdate {
  language: AppLanguage
  theme: ThemePreference
  currency: string
  date_format: string
  time_format: TimeFormat
  calendar_first_day: CalendarFirstDay
  calendar_slot_step_minutes: number
  default_calendar_view: MasterCalendarViewType
}

/** Fields editable from the Notifications settings form. */
export interface MasterNotificationSettingsUpdate {
  client_reminder_whatsapp_enabled: boolean
  client_reminder_offsets_minutes: number[]
  alert_new_booking_enabled: boolean
  alert_awaiting_confirmation_enabled: boolean
  alert_cancellation_enabled: boolean
  alert_upcoming_appointment_enabled: boolean
  alert_upcoming_offset_minutes: number
}

export interface MasterPreferences {
  profile: MasterProfile | null
  settings: MasterSettings
  timeFormat: TimeFormat
  timeZone: string
  calendarFirstDay: CalendarFirstDay
  calendarSlotStepMinutes: number
  defaultCalendarView: MasterCalendarViewType
  language: AppLanguage
  theme: ThemePreference
  currency: string
  dateFormat: string
  onlineBookingEnabled: boolean
  bookingDefaultStatus: BookingDefaultStatus
  bookingBufferMinutes: number
  bookingMinNoticeMinutes: number
  clientReminderWhatsappEnabled: boolean
  clientReminderOffsetsMinutes: number[]
  alertNewBookingEnabled: boolean
  alertAwaitingConfirmationEnabled: boolean
  alertCancellationEnabled: boolean
  alertUpcomingAppointmentEnabled: boolean
  alertUpcomingOffsetMinutes: number
}
