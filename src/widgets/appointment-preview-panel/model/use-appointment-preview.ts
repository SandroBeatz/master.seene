import { useOverlay } from '@nuxt/ui/composables'
import type { Appointment } from '@entities/appointment'
import AppointmentPreviewOverlay from '../ui/AppointmentPreviewOverlay.vue'

/**
 * Programmatic appointment preview.
 *
 * Opens a self-contained slideover showing {@link AppointmentPreviewOverlay}: the
 * preview panel plus all of its actions (confirm / cancel / complete / edit) wired
 * internally — status mutations, the checkout modal, the edit form, and the cancel
 * confirmation. Call sites only need to hand it an appointment.
 *
 * Must be called from a component `setup`.
 *
 * @example
 * const preview = useAppointmentPreview()
 * preview.open({ appointment })
 */
export function useAppointmentPreview() {
  const overlay = useOverlay()
  const dialog = overlay.create(AppointmentPreviewOverlay)

  return {
    open: (props: { appointment: Appointment }) => dialog.open(props),
  }
}
