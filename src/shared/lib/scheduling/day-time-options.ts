/** Minutes in a full day; a valid time is `[0, 1440)`. */
const MINUTES_PER_DAY = 24 * 60

export interface DayTimeOptionsInput {
  /** Grid granularity, minutes (e.g. 15). Non-positive yields `[]`. */
  stepMinutes: number
  /**
   * Earliest minute to include (inclusive). Defaults to `0` — the whole day,
   * including times already in the past, so the master can log a force-majeure
   * booking at any time. Values below `0` are clamped to the start of the day.
   */
  earliest?: number
}

/** Smallest multiple of `step` that is `>= value` (grid anchored to midnight). */
function ceilToStep(value: number, step: number): number {
  return Math.ceil(value / step) * step
}

/**
 * Every start time in a day on the step grid anchored to midnight, from
 * `earliest` (default `0`) up to but excluding `24:00`. Independent of any
 * working window or busy intervals — this backs the "set time manually" escape
 * hatch, which lets the master place a booking on any day at any time.
 */
export function buildDayTimeOptions(input: DayTimeOptionsInput): number[] {
  const { stepMinutes } = input
  if (stepMinutes <= 0) return []

  const earliest = Math.max(0, input.earliest ?? 0)
  const options: number[] = []
  for (let t = ceilToStep(earliest, stepMinutes); t < MINUTES_PER_DAY; t += stepMinutes) {
    options.push(t)
  }
  return options
}
