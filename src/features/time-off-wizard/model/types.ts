/** Prefill for the time-off wizard (e.g. calendar slot click). */
export interface TimeOffPrefill {
  /** Calendar date `YYYY-MM-DD` in the master's timezone. */
  date?: string
  /** Wall-clock start time `HH:mm`; the end is left for the master to fill. */
  startTime?: string
}
