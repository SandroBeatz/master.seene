import { mergeIntervals } from './intervals'
import type { AvailabilityInput, Interval } from './types'

/**
 * Free gaps within the working window — the complement of the busy set inside
 * `[workStart, workEnd]`. Used by the Time-off flow to show "Free time:
 * 09:00–11:00 …" and to bound the manual From/To pickers (these are true gaps,
 * not step-grid slots).
 *
 * An empty/degenerate window yields `[]`. A day with no busy blocks yields the
 * whole window. A fully booked day yields `[]`. Adjacent busy blocks (e.g. a
 * break ending exactly when an appointment starts) produce no zero-length gap.
 */
export function findFreeIntervals(input: AvailabilityInput): Interval[] {
  const { workStart, workEnd } = input
  if (workEnd <= workStart) return []

  const busy = mergeIntervals([...(input.busy ?? []), ...(input.breaks ?? [])], workStart, workEnd)

  const free: Interval[] = []
  let cursor = workStart
  for (const [start, end] of busy) {
    if (start > cursor) free.push([cursor, start])
    cursor = Math.max(cursor, end)
  }
  if (cursor < workEnd) free.push([cursor, workEnd])

  return free
}
