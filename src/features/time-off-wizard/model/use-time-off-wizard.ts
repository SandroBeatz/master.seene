import { useOverlay } from '@nuxt/ui/composables'
import TimeOffWizardModal from '../ui/TimeOffWizardModal.vue'
import type { TimeOffPrefill } from './types'

/**
 * Programmatic time-off (block) creation flow.
 *
 * Mounts a self-contained {@link TimeOffWizardModal} via `useOverlay` and
 * returns an imperative opener. Callers: the calendar slot click (with a
 * `date`/`startTime` prefill) and the quick-create menu.
 *
 * Must be called from a component `setup`.
 *
 * @example
 * const timeOffWizard = useTimeOffWizard()
 * timeOffWizard.open({ date, startTime })
 */
export function useTimeOffWizard() {
  const overlay = useOverlay()
  const dialog = overlay.create(TimeOffWizardModal)

  return {
    open: (prefill?: TimeOffPrefill) => dialog.open({ prefill }),
  }
}
