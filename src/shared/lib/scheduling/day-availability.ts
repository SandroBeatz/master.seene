import { findAvailableSlots } from './find-available-slots'
import type { FindAvailableSlotsInput } from './types'

/**
 * Whether a day offers at least one bookable slot for `durationMinutes`. Drives
 * the month calendar: days with no working hours or no fitting free slot are
 * disabled. Consistent with {@link findAvailableSlots} by construction — a day
 * is enabled iff that function would return a non-empty list.
 */
export function hasAnyFreeSlot(input: FindAvailableSlotsInput): boolean {
  return findAvailableSlots(input).length > 0
}
