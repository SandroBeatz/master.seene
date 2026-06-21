import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ALERT_UPCOMING_OFFSET_MINUTES,
  DEFAULT_BOOKING_BUFFER_MINUTES,
  DEFAULT_BOOKING_MIN_NOTICE_MINUTES,
  DEFAULT_BOOKING_STATUS,
  DEFAULT_CALENDAR_FIRST_DAY,
  DEFAULT_CALENDAR_SLOT_STEP_MINUTES,
  DEFAULT_CALENDAR_VIEW,
  DEFAULT_CLIENT_REMINDER_OFFSETS,
  DEFAULT_TIME_FORMAT,
  createMasterPreferences,
  getTimeZoneFromSchedule,
  normalizeAlertUpcomingOffsetMinutes,
  normalizeBookingBufferMinutes,
  normalizeBookingDefaultStatus,
  normalizeBookingMinNoticeMinutes,
  normalizeBool,
  normalizeCalendarFirstDay,
  normalizeCalendarSlotStepMinutes,
  normalizeClientReminderOffsets,
  normalizeDefaultCalendarView,
  normalizeOnlineBookingEnabled,
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

  it('normalizes booking settings with safe defaults', () => {
    expect(normalizeOnlineBookingEnabled(true)).toBe(true)
    expect(normalizeOnlineBookingEnabled(false)).toBe(false)
    expect(normalizeOnlineBookingEnabled('true')).toBe(false)
    expect(normalizeOnlineBookingEnabled(null)).toBe(false)

    expect(normalizeBookingDefaultStatus('confirmed')).toBe('confirmed')
    expect(normalizeBookingDefaultStatus('pending')).toBe('pending')
    expect(normalizeBookingDefaultStatus('completed')).toBe(DEFAULT_BOOKING_STATUS)
    expect(normalizeBookingDefaultStatus(null)).toBe(DEFAULT_BOOKING_STATUS)

    expect(normalizeBookingBufferMinutes(10)).toBe(10)
    expect(normalizeBookingBufferMinutes('30')).toBe(30)
    expect(normalizeBookingBufferMinutes(0)).toBe(0)
    expect(normalizeBookingBufferMinutes(241)).toBe(DEFAULT_BOOKING_BUFFER_MINUTES)
    expect(normalizeBookingBufferMinutes(-5)).toBe(DEFAULT_BOOKING_BUFFER_MINUTES)
    expect(normalizeBookingBufferMinutes(12.5)).toBe(DEFAULT_BOOKING_BUFFER_MINUTES)

    expect(normalizeBookingMinNoticeMinutes(120)).toBe(120)
    expect(normalizeBookingMinNoticeMinutes('1440')).toBe(1440)
    expect(normalizeBookingMinNoticeMinutes(0)).toBe(0)
    expect(normalizeBookingMinNoticeMinutes(-1)).toBe(DEFAULT_BOOKING_MIN_NOTICE_MINUTES)
    expect(normalizeBookingMinNoticeMinutes('abc')).toBe(DEFAULT_BOOKING_MIN_NOTICE_MINUTES)
  })

  it('creates default settings when master_settings is missing', () => {
    const preferences = createMasterPreferences(
      {
        id: 'profile-1',
        user_id: 'user-1',
        first_name: 'Karina',
        last_name: 'Mi',
        username: 'karinami',
        specializations: [],
        bio: null,
        schedule: { timezone: 'Asia/Bishkek' },
        phone: '+996700000000',
        whatsapp: null,
        telegram: null,
        instagram: null,
        tiktok: null,
        contact_email: null,
        country: 'KG',
        address: null,
        house_number: null,
        zip_code: null,
        city: null,
        place_id: null,
        works_at_place: true,
        can_travel: false,
      },
      null,
    )

    expect(preferences.settings).toEqual({
      user_id: 'user-1',
      time_format: 24,
      calendar_first_day: 1,
      calendar_slot_step_minutes: 15,
      default_calendar_view: 'timeGridWeek',
      online_booking_enabled: false,
      booking_default_status: 'pending',
      booking_buffer_minutes: 0,
      booking_min_notice_minutes: 0,
      client_reminder_whatsapp_enabled: false,
      client_reminder_offsets_minutes: [1440, 120],
      alert_new_booking_enabled: true,
      alert_awaiting_confirmation_enabled: true,
      alert_cancellation_enabled: true,
      alert_upcoming_appointment_enabled: false,
      alert_upcoming_offset_minutes: 60,
    })
    expect(preferences.timeFormat).toBe(24)
    expect(preferences.timeZone).toBe('Asia/Bishkek')
    expect(preferences.calendarFirstDay).toBe(1)
    expect(preferences.calendarSlotStepMinutes).toBe(15)
    expect(preferences.defaultCalendarView).toBe('timeGridWeek')
    expect(preferences.onlineBookingEnabled).toBe(false)
    expect(preferences.bookingDefaultStatus).toBe('pending')
    expect(preferences.bookingBufferMinutes).toBe(0)
    expect(preferences.bookingMinNoticeMinutes).toBe(0)
    // Notification defaults when no row exists.
    expect(preferences.clientReminderWhatsappEnabled).toBe(false)
    expect(preferences.clientReminderOffsetsMinutes).toEqual([1440, 120])
    expect(preferences.alertNewBookingEnabled).toBe(true)
    expect(preferences.alertAwaitingConfirmationEnabled).toBe(true)
    expect(preferences.alertCancellationEnabled).toBe(true)
    expect(preferences.alertUpcomingAppointmentEnabled).toBe(false)
    expect(preferences.alertUpcomingOffsetMinutes).toBe(60)
  })

  it('uses saved calendar settings when master_settings exists', () => {
    const preferences = createMasterPreferences(null, {
      user_id: 'user-1',
      time_format: 12,
      calendar_first_day: 0,
      calendar_slot_step_minutes: 30,
      default_calendar_view: 'timeGridDay',
      online_booking_enabled: true,
      booking_default_status: 'confirmed',
      booking_buffer_minutes: 15,
      booking_min_notice_minutes: 120,
      client_reminder_whatsapp_enabled: true,
      client_reminder_offsets_minutes: [60],
      alert_new_booking_enabled: false,
      alert_awaiting_confirmation_enabled: false,
      alert_cancellation_enabled: true,
      alert_upcoming_appointment_enabled: true,
      alert_upcoming_offset_minutes: 30,
    })

    expect(preferences.settings).toEqual({
      user_id: 'user-1',
      time_format: 12,
      calendar_first_day: 0,
      calendar_slot_step_minutes: 30,
      default_calendar_view: 'timeGridDay',
      online_booking_enabled: true,
      booking_default_status: 'confirmed',
      booking_buffer_minutes: 15,
      booking_min_notice_minutes: 120,
      client_reminder_whatsapp_enabled: true,
      client_reminder_offsets_minutes: [60],
      alert_new_booking_enabled: false,
      alert_awaiting_confirmation_enabled: false,
      alert_cancellation_enabled: true,
      alert_upcoming_appointment_enabled: true,
      alert_upcoming_offset_minutes: 30,
    })
    expect(preferences.timeFormat).toBe(12)
    expect(preferences.calendarFirstDay).toBe(0)
    expect(preferences.calendarSlotStepMinutes).toBe(30)
    expect(preferences.defaultCalendarView).toBe('timeGridDay')
    expect(preferences.onlineBookingEnabled).toBe(true)
    expect(preferences.bookingDefaultStatus).toBe('confirmed')
    expect(preferences.bookingBufferMinutes).toBe(15)
    expect(preferences.bookingMinNoticeMinutes).toBe(120)
    expect(preferences.clientReminderWhatsappEnabled).toBe(true)
    expect(preferences.clientReminderOffsetsMinutes).toEqual([60])
    expect(preferences.alertNewBookingEnabled).toBe(false)
    expect(preferences.alertAwaitingConfirmationEnabled).toBe(false)
    expect(preferences.alertCancellationEnabled).toBe(true)
    expect(preferences.alertUpcomingAppointmentEnabled).toBe(true)
    expect(preferences.alertUpcomingOffsetMinutes).toBe(30)
  })

  it('normalizes notification booleans with safe fallbacks', () => {
    expect(normalizeBool(true, false)).toBe(true)
    expect(normalizeBool(false, true)).toBe(false)
    expect(normalizeBool('true', false)).toBe(false)
    expect(normalizeBool(undefined, true)).toBe(true)
    expect(normalizeBool(null, false)).toBe(false)
  })

  it('normalizes client reminder offsets (whitelist, dedupe, ordering)', () => {
    // Valid values are kept and re-ordered largest-first.
    expect(normalizeClientReminderOffsets([60, 1440])).toEqual([1440, 60])
    // Duplicates collapse.
    expect(normalizeClientReminderOffsets([120, 120, 60])).toEqual([120, 60])
    // String numbers are coerced.
    expect(normalizeClientReminderOffsets(['1440', '120'])).toEqual([1440, 120])
    // Unsupported values are dropped, keeping the valid ones.
    expect(normalizeClientReminderOffsets([1440, 90, 5])).toEqual([1440])
    // An empty array is an intentional, valid "no timings" selection.
    expect(normalizeClientReminderOffsets([])).toEqual([])
    // Entirely invalid input falls back to the default set.
    expect(normalizeClientReminderOffsets([90, 5])).toEqual(DEFAULT_CLIENT_REMINDER_OFFSETS)
    expect(normalizeClientReminderOffsets(null)).toEqual(DEFAULT_CLIENT_REMINDER_OFFSETS)
    expect(normalizeClientReminderOffsets('1440')).toEqual(DEFAULT_CLIENT_REMINDER_OFFSETS)
  })

  it('normalizes the master upcoming-appointment offset', () => {
    expect(normalizeAlertUpcomingOffsetMinutes(30)).toBe(30)
    expect(normalizeAlertUpcomingOffsetMinutes('120')).toBe(120)
    expect(normalizeAlertUpcomingOffsetMinutes(0)).toBe(0)
    expect(normalizeAlertUpcomingOffsetMinutes(-5)).toBe(DEFAULT_ALERT_UPCOMING_OFFSET_MINUTES)
    expect(normalizeAlertUpcomingOffsetMinutes(12.5)).toBe(DEFAULT_ALERT_UPCOMING_OFFSET_MINUTES)
    expect(normalizeAlertUpcomingOffsetMinutes('abc')).toBe(DEFAULT_ALERT_UPCOMING_OFFSET_MINUTES)
  })
})
