import { useOverlay } from '@nuxt/ui/composables'
import { useAppointmentWizard, type AppointmentPrefill } from '@features/appointment-wizard'
import { useTimeOffWizard, type TimeOffPrefill } from '@features/time-off-wizard'
import QuickCreateActionModal from '../ui/QuickCreateActionModal.vue'

/**
 * Quick-create entry point (mirrors {@link useAppointmentPreview}).
 *
 * Composes the two self-contained wizard features. {@link openMenu} shows the
 * choice modal and, on selection, opens the matching wizard modal. The direct
 * openers ({@link openAppointment} / {@link openTimeOff}) skip the menu — used by
 * the calendar slot click, which already knows the intent and prefills Step 3.
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
  const menu = overlay.create(QuickCreateActionModal)
  const appointmentWizard = useAppointmentWizard()
  const timeOffWizard = useTimeOffWizard()

  async function openMenu() {
    const choice = await menu.open().result
    if (choice === 'appointment') appointmentWizard.open()
    else if (choice === 'timeOff') timeOffWizard.open()
  }

  return {
    openMenu,
    openAppointment: (prefill?: AppointmentPrefill) => appointmentWizard.open(prefill),
    openTimeOff: (prefill?: TimeOffPrefill) => timeOffWizard.open(prefill),
  }
}
