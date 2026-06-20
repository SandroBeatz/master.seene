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

/** Local, editable shape of the Booking settings form. */
export interface BookingSettingsState {
  onlineBookingEnabled: boolean
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
  const state = ref<BookingSettingsState>({
    onlineBookingEnabled: DEFAULT_ONLINE_BOOKING_ENABLED,
    defaultStatus: DEFAULT_BOOKING_STATUS,
    bufferMinutes: DEFAULT_BOOKING_BUFFER_MINUTES,
    minNoticeMinutes: DEFAULT_BOOKING_MIN_NOTICE_MINUTES,
  })

  function seed(preferences: MasterPreferences): void {
    state.value = {
      onlineBookingEnabled: preferences.onlineBookingEnabled,
      defaultStatus: preferences.bookingDefaultStatus,
      bufferMinutes: preferences.bookingBufferMinutes,
      minNoticeMinutes: preferences.bookingMinNoticeMinutes,
    }
  }

  function toUpdate(): MasterBookingSettingsUpdate {
    return {
      online_booking_enabled: state.value.onlineBookingEnabled,
      booking_default_status: state.value.defaultStatus,
      booking_buffer_minutes: state.value.bufferMinutes,
      booking_min_notice_minutes: state.value.minNoticeMinutes,
    }
  }

  return { state, seed, toUpdate }
}
