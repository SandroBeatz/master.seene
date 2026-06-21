import { ref } from 'vue'
import {
  DEFAULT_ALERT_AWAITING_CONFIRMATION_ENABLED,
  DEFAULT_ALERT_CANCELLATION_ENABLED,
  DEFAULT_ALERT_NEW_BOOKING_ENABLED,
  DEFAULT_ALERT_UPCOMING_APPOINTMENT_ENABLED,
  DEFAULT_ALERT_UPCOMING_OFFSET_MINUTES,
  DEFAULT_CLIENT_REMINDER_OFFSETS,
  DEFAULT_CLIENT_REMINDER_WHATSAPP_ENABLED,
} from '@entities/master'
import type { MasterNotificationSettingsUpdate, MasterPreferences } from '@entities/master'

/**
 * Local, editable shape of the Notifications settings form. Mirrors
 * `useBookingSettings` — a single dirty-tracked `state` object that the
 * Save bar governs (there is no instant-save toggle here).
 */
export interface NotificationSettingsState {
  clientWhatsappEnabled: boolean
  clientReminderOffsets: number[]
  alertNewBooking: boolean
  alertAwaitingConfirmation: boolean
  alertCancellation: boolean
  alertUpcomingEnabled: boolean
  alertUpcomingOffsetMinutes: number
}

/**
 * Holds the Notifications form state and maps it to/from the master preferences
 * and the update DTO. Mirrors `useBookingSettings`.
 */
export function useNotificationSettings() {
  const state = ref<NotificationSettingsState>({
    clientWhatsappEnabled: DEFAULT_CLIENT_REMINDER_WHATSAPP_ENABLED,
    clientReminderOffsets: [...DEFAULT_CLIENT_REMINDER_OFFSETS],
    alertNewBooking: DEFAULT_ALERT_NEW_BOOKING_ENABLED,
    alertAwaitingConfirmation: DEFAULT_ALERT_AWAITING_CONFIRMATION_ENABLED,
    alertCancellation: DEFAULT_ALERT_CANCELLATION_ENABLED,
    alertUpcomingEnabled: DEFAULT_ALERT_UPCOMING_APPOINTMENT_ENABLED,
    alertUpcomingOffsetMinutes: DEFAULT_ALERT_UPCOMING_OFFSET_MINUTES,
  })

  function seed(preferences: MasterPreferences): void {
    state.value = {
      clientWhatsappEnabled: preferences.clientReminderWhatsappEnabled,
      clientReminderOffsets: [...preferences.clientReminderOffsetsMinutes],
      alertNewBooking: preferences.alertNewBookingEnabled,
      alertAwaitingConfirmation: preferences.alertAwaitingConfirmationEnabled,
      alertCancellation: preferences.alertCancellationEnabled,
      alertUpcomingEnabled: preferences.alertUpcomingAppointmentEnabled,
      alertUpcomingOffsetMinutes: preferences.alertUpcomingOffsetMinutes,
    }
  }

  function toUpdate(): MasterNotificationSettingsUpdate {
    return {
      client_reminder_whatsapp_enabled: state.value.clientWhatsappEnabled,
      client_reminder_offsets_minutes: state.value.clientReminderOffsets,
      alert_new_booking_enabled: state.value.alertNewBooking,
      alert_awaiting_confirmation_enabled: state.value.alertAwaitingConfirmation,
      alert_cancellation_enabled: state.value.alertCancellation,
      alert_upcoming_appointment_enabled: state.value.alertUpcomingEnabled,
      alert_upcoming_offset_minutes: state.value.alertUpcomingOffsetMinutes,
    }
  }

  /** Toggles a reminder offset (e.g. 1440) in/out of the selected set. */
  function toggleOffset(offset: number, checked: boolean): void {
    const current = new Set(state.value.clientReminderOffsets)
    if (checked) current.add(offset)
    else current.delete(offset)
    state.value.clientReminderOffsets = [...current]
  }

  return { state, seed, toUpdate, toggleOffset }
}
