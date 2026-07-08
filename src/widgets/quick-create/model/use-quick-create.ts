import { useOverlay } from '@nuxt/ui/composables'
import QuickCreateOverlay from '../ui/QuickCreateOverlay.vue'
import type { AppointmentPrefill, TimeOffPrefill } from './types'

/**
 * Programmatic quick-create flow.
 *
 * Mounts a single {@link QuickCreateOverlay} (mirroring `useAppointmentPreview`)
 * and returns imperative openers shared by all three entry points: the home and
 * calendar "+" buttons ({@link openMenu}) and the calendar slot click
 * ({@link openAppointment} / {@link openTimeOff}, which prefill Step 3).
 *
 * Must be called from a component `setup`.
 *
 * @example
 * const quickCreate = useQuickCreate()
 * quickCreate.openMenu()
 * quickCreate.openAppointment({ startAt })
 */
export function useQuickCreate() {
  const overlay = useOverlay()
  const dialog = overlay.create(QuickCreateOverlay)

  return {
    openMenu: () => dialog.open({ mode: 'menu' }),
    openAppointment: (prefill?: AppointmentPrefill) =>
      dialog.open({ mode: 'appointment', appointmentPrefill: prefill }),
    openTimeOff: (prefill?: TimeOffPrefill) =>
      dialog.open({ mode: 'timeOff', timeOffPrefill: prefill }),
  }
}
