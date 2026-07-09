/** Prefill for the appointment wizard (e.g. calendar slot click). */
export interface AppointmentPrefill {
  /** UTC ISO start instant for Step 3 — collapses date + time and skips the step. */
  startAt?: string
}
