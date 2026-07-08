/** Which view the quick-create overlay opens on. */
export type QuickCreateMode = 'menu' | 'appointment' | 'timeOff'

/** Prefill for the appointment wizard (calendar slot click). */
export interface AppointmentPrefill {
  /** UTC ISO start instant for Step 3 — collapses date + time and skips the step. */
  startAt?: string
}

/** Prefill for the time-off wizard (calendar slot click). */
export interface TimeOffPrefill {
  /** Calendar date `YYYY-MM-DD` in the master's timezone. */
  date?: string
  /** Wall-clock start time `HH:mm`; the end is left for the master to fill. */
  startTime?: string
}
