import { useOverlay } from '@nuxt/ui/composables'
import AppointmentWizardModal from '../ui/AppointmentWizardModal.vue'
import type { AppointmentPrefill } from './types'

/**
 * Programmatic appointment-creation flow.
 *
 * Mounts a self-contained {@link AppointmentWizardModal} via `useOverlay` and
 * returns an imperative opener. Callers: the calendar slot click (with a
 * `startAt` prefill that skips the date/time step) and the quick-create menu.
 *
 * Must be called from a component `setup`.
 *
 * @example
 * const appointmentWizard = useAppointmentWizard()
 * appointmentWizard.open({ startAt })
 */
export function useAppointmentWizard() {
  const overlay = useOverlay()
  const dialog = overlay.create(AppointmentWizardModal)

  return {
    open: (prefill?: AppointmentPrefill) => dialog.open({ prefill }),
  }
}
