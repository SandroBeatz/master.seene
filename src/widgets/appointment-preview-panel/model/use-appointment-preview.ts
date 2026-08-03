import { useOverlay } from '@nuxt/ui/composables'
import type { Appointment } from '@entities/appointment'
import { useIsMobile } from '@shared/lib/viewport'
import AppointmentPreviewOverlay from '../ui/AppointmentPreviewOverlay.vue'
import MobileAppointmentSheetOverlay from '../ui/MobileAppointmentSheetOverlay.vue'

/**
 * Programmatic appointment preview.
 *
 * Opens a self-contained overlay wiring all of the preview's actions (confirm /
 * cancel / complete / edit / delete) internally — status mutations, the checkout
 * modal, the edit flow, and confirmations. Call sites only hand it an appointment.
 *
 * The presentation adapts to the viewport: a bottom-sheet ({@link MobileAppointmentSheetOverlay})
 * on mobile, the desktop slideover ({@link AppointmentPreviewOverlay}) otherwise. The
 * viewport is read at open time, so the correct surface is chosen per invocation.
 *
 * Must be called from a component `setup`.
 *
 * @example
 * const preview = useAppointmentPreview()
 * preview.open({ appointment })
 */
export function useAppointmentPreview() {
  const overlay = useOverlay()
  const isMobile = useIsMobile()
  const desktop = overlay.create(AppointmentPreviewOverlay)
  const mobile = overlay.create(MobileAppointmentSheetOverlay)

  return {
    open: (props: { appointment: Appointment }) =>
      (isMobile.value ? mobile : desktop).open(props),
  }
}
