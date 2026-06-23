import { ref } from 'vue'
import {
  DEFAULT_CALENDAR_FIRST_DAY,
  DEFAULT_CALENDAR_SLOT_STEP_MINUTES,
  DEFAULT_CALENDAR_VIEW,
  DEFAULT_CURRENCY,
  DEFAULT_DATE_FORMAT,
  DEFAULT_LANGUAGE,
  DEFAULT_THEME,
  DEFAULT_TIME_FORMAT,
  getDefaultTimeZone,
} from '@entities/master'
import type {
  AppLanguage,
  CalendarFirstDay,
  MasterCalendarViewType,
  MasterPreferences,
  MasterProfile,
  MasterSchedule,
  MasterSystemSettingsUpdate,
  ThemePreference,
  TimeFormat,
} from '@entities/master'

/**
 * Local, editable shape of the System & region settings form. Mirrors
 * `useBookingSettings` / `useNotificationSettings` — a single dirty-tracked
 * `state` object governed by the Save bar.
 *
 * `timezone` is part of the form but persisted separately: it lives in
 * profile.schedule.timezone (single source of truth, shared with Working Hours),
 * so the form saves it via the schedule mutation, not the system-settings DTO.
 */
export interface SystemSettingsState {
  language: AppLanguage
  theme: ThemePreference
  currency: string
  timeFormat: TimeFormat
  dateFormat: string
  timezone: string
  firstDay: CalendarFirstDay
  calendarView: MasterCalendarViewType
  slotStepMinutes: number
}

/**
 * Holds the System & region form state and maps it to/from the master
 * preferences, the system-settings DTO, and the schedule (for timezone).
 */
export function useSystemSettings() {
  const state = ref<SystemSettingsState>({
    language: DEFAULT_LANGUAGE,
    theme: DEFAULT_THEME,
    currency: DEFAULT_CURRENCY,
    timeFormat: DEFAULT_TIME_FORMAT,
    dateFormat: DEFAULT_DATE_FORMAT,
    timezone: getDefaultTimeZone(),
    firstDay: DEFAULT_CALENDAR_FIRST_DAY,
    calendarView: DEFAULT_CALENDAR_VIEW,
    slotStepMinutes: DEFAULT_CALENDAR_SLOT_STEP_MINUTES,
  })

  function seed(preferences: MasterPreferences): void {
    state.value = {
      language: preferences.language,
      theme: preferences.theme,
      currency: preferences.currency,
      timeFormat: preferences.timeFormat,
      dateFormat: preferences.dateFormat,
      // preferences.timeZone is already resolved from profile.schedule.timezone.
      timezone: preferences.timeZone,
      firstDay: preferences.calendarFirstDay,
      calendarView: preferences.defaultCalendarView,
      slotStepMinutes: preferences.calendarSlotStepMinutes,
    }
  }

  /** Payload for master_settings (everything except timezone). */
  function toUpdate(): MasterSystemSettingsUpdate {
    return {
      language: state.value.language,
      theme: state.value.theme,
      currency: state.value.currency,
      date_format: state.value.dateFormat,
      time_format: state.value.timeFormat,
      calendar_first_day: state.value.firstDay,
      calendar_slot_step_minutes: state.value.slotStepMinutes,
      default_calendar_view: state.value.calendarView,
    }
  }

  /**
   * Returns the master's schedule with the timezone replaced by the form value,
   * preserving the existing `days` so saving the timezone never wipes the
   * working hours. Used to persist the timezone via the schedule mutation.
   */
  function toScheduleUpdate(profile: MasterProfile | null): MasterSchedule {
    return {
      ...profile?.schedule,
      timezone: state.value.timezone,
    }
  }

  return { state, seed, toUpdate, toScheduleUpdate }
}
