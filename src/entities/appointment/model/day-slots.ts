import {
  intervalsOverlap,
  type FindAvailableSlotsInput,
  type Interval,
} from '@shared/lib/scheduling'

/**
 * How a candidate start time reads on the slot grid:
 * - `free` — `[t, t + duration)` fits the working window and overlaps nothing;
 * - `busy` — the start itself falls inside a booking / time off / break;
 * - `short` — the start is free, but the duration runs into the next booking or
 *   past the end of the working day.
 */
export type DaySlotState = 'free' | 'busy' | 'short'

export interface DaySlot {
  /** Start, minutes since midnight in the master's timezone. */
  minutes: number
  state: DaySlotState
}

function ceilToStep(value: number, step: number): number {
  return Math.ceil(value / step) * step
}

/**
 * Every step-grid start inside the working window, classified as free / busy /
 * short. Unlike `findAvailableSlots` (free starts only) this keeps occupied
 * starts too, so the UI can show the whole day — what's free and what's taken.
 * The `free` subset always equals `findAvailableSlots` for the same input.
 */
export function buildDaySlots(input: FindAvailableSlotsInput): DaySlot[] {
  const { workStart, workEnd, stepMinutes } = input
  if (stepMinutes <= 0 || workEnd <= workStart) return []

  const duration = input.durationMinutes > 0 ? input.durationMinutes : stepMinutes
  const earliest = Math.max(workStart, input.earliest ?? workStart)
  const blocks: Interval[] = [...(input.busy ?? []), ...(input.breaks ?? [])]

  const slots: DaySlot[] = []
  for (let t = ceilToStep(earliest, stepMinutes); t < workEnd; t += stepMinutes) {
    const cell: Interval = [t, t + stepMinutes]
    const candidate: Interval = [t, t + duration]

    let state: DaySlotState = 'free'
    if (blocks.some((block) => intervalsOverlap(cell, block))) state = 'busy'
    else if (candidate[1] > workEnd || blocks.some((block) => intervalsOverlap(candidate, block)))
      state = 'short'

    slots.push({ minutes: t, state })
  }

  return slots
}
