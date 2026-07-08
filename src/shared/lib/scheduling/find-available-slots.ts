import { intervalsOverlap } from './intervals'
import type { FindAvailableSlotsInput, Interval } from './types'

/** Smallest multiple of `step` that is `>= value` (grid anchored to midnight). */
function ceilToStep(value: number, step: number): number {
  return Math.ceil(value / step) * step
}

/**
 * Candidate start minutes for an appointment of `durationMinutes` on one day.
 *
 * Walks the step grid from `earliest` (defaults to `workStart`) and keeps every
 * start `t` where `[t, t + durationMinutes)` fits fully inside the working
 * window and overlaps no busy interval (appointments + time offs + breaks).
 *
 * Returns `[]` for a non-working day, a non-positive step/duration, or when
 * nothing fits. Order of `busy`/`breaks` is irrelevant; degenerate intervals
 * (`start >= end`) never match and are harmless.
 */
export function findAvailableSlots(input: FindAvailableSlotsInput): number[] {
  const { workStart, workEnd, stepMinutes, durationMinutes } = input

  if (stepMinutes <= 0 || durationMinutes <= 0) return []
  if (workEnd - workStart < durationMinutes) return []

  const earliest = Math.max(workStart, input.earliest ?? workStart)
  const blocks: Interval[] = [...(input.busy ?? []), ...(input.breaks ?? [])]

  const slots: number[] = []
  for (
    let t = ceilToStep(earliest, stepMinutes);
    t + durationMinutes <= workEnd;
    t += stepMinutes
  ) {
    const candidate: Interval = [t, t + durationMinutes]
    if (!blocks.some((block) => intervalsOverlap(candidate, block))) {
      slots.push(t)
    }
  }

  return slots
}
