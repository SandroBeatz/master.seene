/**
 * Pure scheduling primitives. Everything here is expressed in **minutes since
 * midnight** in the master's timezone — never `Date` objects — so the math is
 * timezone-safe and exhaustively unit-testable. The caller (widget/feature
 * layer) is responsible for converting DB timestamps into these minutes.
 */

/** A half-open interval `[start, end)` in minutes since midnight. */
export type Interval = readonly [start: number, end: number]

/** Inputs shared by slot search and day-availability checks. */
export interface AvailabilityInput {
  /** Working window start, minutes since midnight. */
  workStart: number
  /** Working window end, minutes since midnight. */
  workEnd: number
  /** Schedule breaks for the day (treated as busy). */
  breaks?: Interval[]
  /** Busy intervals — appointments + time offs, already mapped to minutes. */
  busy?: Interval[]
}

export interface FindAvailableSlotsInput extends AvailabilityInput {
  /** Grid granularity for candidate start times (e.g. 15). */
  stepMinutes: number
  /** Total duration a candidate slot must fit (sum of service durations). */
  durationMinutes: number
  /**
   * Earliest allowed start, minutes since midnight. Defaults to `workStart`.
   * For "today" pass `max(workStart, nowMinutes)` so past times aren't offered.
   */
  earliest?: number
}
