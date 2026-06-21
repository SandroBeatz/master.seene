import { ref } from 'vue'
import {
  DEFAULT_BOOKING_BUFFER_MINUTES,
  DEFAULT_BOOKING_MIN_NOTICE_MINUTES,
  DEFAULT_BOOKING_STATUS,
  DEFAULT_ONLINE_BOOKING_ENABLED,
} from '@entities/master'
import type {
  BookingDefaultStatus,
  MasterBookingSettingsUpdate,
  MasterPreferences,
} from '@entities/master'

/**
 * Local, editable shape of the Booking settings form.
 *
 * `onlineBookingEnabled` is intentionally NOT part of this object: the header
 * switch saves instantly on toggle (see `BookingSettingsForm`), so it lives in
 * its own ref and is excluded from the dirty-tracked form state that drives the
 * Save bar. Only the fields below require an explicit "Save changes".
 */
export interface BookingSettingsState {
  defaultStatus: BookingDefaultStatus
  bufferMinutes: number
  minNoticeMinutes: number
}

/**
 * Holds the Booking form state and maps it to/from the master preferences and
 * the update DTO. Mirrors the `useWorkingHours` composable used by the working
 * hours form.
 */
export function useBookingSettings() {
  // Saved instantly on toggle — kept out of the dirty-tracked `state`.
  const onlineEnabled = ref<boolean>(DEFAULT_ONLINE_BOOKING_ENABLED)

  const state = ref<BookingSettingsState>({
    defaultStatus: DEFAULT_BOOKING_STATUS,
    bufferMinutes: DEFAULT_BOOKING_BUFFER_MINUTES,
    minNoticeMinutes: DEFAULT_BOOKING_MIN_NOTICE_MINUTES,
  })

  function seed(preferences: MasterPreferences): void {
    onlineEnabled.value = preferences.onlineBookingEnabled
    state.value = {
      defaultStatus: preferences.bookingDefaultStatus,
      bufferMinutes: preferences.bookingBufferMinutes,
      minNoticeMinutes: preferences.bookingMinNoticeMinutes,
    }
  }

  /** Full payload: current online flag + the body fields. Used by the Save bar. */
  function toUpdate(): MasterBookingSettingsUpdate {
    return {
      online_booking_enabled: onlineEnabled.value,
      booking_default_status: state.value.defaultStatus,
      booking_buffer_minutes: state.value.bufferMinutes,
      booking_min_notice_minutes: state.value.minNoticeMinutes,
    }
  }

  /**
   * Payload that persists only the online flag, reusing the last-saved body
   * values so an instant toggle never commits half-edited (dirty) body fields.
   */
  function toOnlineUpdate(
    preferences: MasterPreferences,
    enabled: boolean,
  ): MasterBookingSettingsUpdate {
    return {
      online_booking_enabled: enabled,
      booking_default_status: preferences.bookingDefaultStatus,
      booking_buffer_minutes: preferences.bookingBufferMinutes,
      booking_min_notice_minutes: preferences.bookingMinNoticeMinutes,
    }
  }

  return { state, onlineEnabled, seed, toUpdate, toOnlineUpdate }
}
