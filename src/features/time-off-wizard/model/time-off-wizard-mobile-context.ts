import { inject, type ComputedRef, type InjectionKey } from 'vue'
import type { MasterSchedule } from '@entities/master'
import type { TimeOffWizard } from './time-off-wizard-mobile'

export type TimeOffStep = 1 | 2

/**
 * Shared state of the mobile time-off flow. The flow component provides it
 * once; both step pages pushed onto the modal's `ion-nav` inject it.
 */
export interface TimeOffWizardMobileContext {
  wizard: TimeOffWizard
  /** Editing an existing time off (save) rather than creating one. */
  isEditing: boolean
  /** Inputs for the date/slot picker. */
  scheduling: {
    userId: ComputedRef<string>
    timeZone: ComputedRef<string>
    schedule: ComputedRef<MasterSchedule | null>
    stepMinutes: ComputedRef<number>
    firstDayOfWeek: ComputedRef<number>
    hourCycle: ComputedRef<'h12' | 'h23'>
    /** The edited time off, so its own slot doesn't read as busy. */
    excludeTimeBlockId: string | null
  }
  /** "Mon, 6 Oct · 13:00 – 14:00" / "Mon, 6 Oct · All day"; '' until picked. */
  summary: ComputedRef<string>
  isSaving: ComputedRef<boolean>
  next: () => void
  close: () => void
  submit: () => Promise<void>
}

export const TIME_OFF_WIZARD_MOBILE_KEY: InjectionKey<TimeOffWizardMobileContext> =
  Symbol('time-off-wizard-mobile')

export function useTimeOffWizardMobile(): TimeOffWizardMobileContext {
  const context = inject(TIME_OFF_WIZARD_MOBILE_KEY)
  if (!context) throw new Error('useTimeOffWizardMobile: wizard context is not provided')
  return context
}
