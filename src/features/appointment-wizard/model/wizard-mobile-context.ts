import { inject, type ComputedRef, type InjectionKey } from 'vue'
import type { Client } from '@entities/client/index.mobile'
import type { MasterSchedule } from '@entities/master'
import type { Service } from '@entities/service/index.mobile'
import type { AppointmentWizardState, WizardStep } from './appointment-wizard'

/**
 * Shared state of the mobile appointment wizard. The flow component provides it
 * once; every step page pushed onto the modal's `ion-nav` injects it, so steps
 * stay thin and the nav stack only carries components (no prop plumbing).
 */
export interface AppointmentWizardMobileContext {
  state: AppointmentWizardState
  clients: ComputedRef<Client[]>
  services: ComputedRef<Service[]>
  selectedClient: ComputedRef<Client | null>
  clientName: ComputedRef<string>
  selectedServices: ComputedRef<Service[]>
  totalDuration: ComputedRef<number>
  effectivePrice: ComputedRef<number | null>
  /** Inputs for the date/slot picker. */
  scheduling: {
    userId: ComputedRef<string>
    timeZone: ComputedRef<string>
    schedule: ComputedRef<MasterSchedule | null>
    stepMinutes: ComputedRef<number>
    firstDayOfWeek: ComputedRef<number>
    hourCycle: ComputedRef<'h12' | 'h23'>
  }
  /** Visible step count — 3 when a prefilled start skips date/time. */
  totalSteps: number
  /** 1-based position of a step in the visible progress. */
  positionOf: (step: WizardStep) => number
  /** Modal element — presenting element for nested sheets (e.g. new client form). */
  modalEl: ComputedRef<HTMLElement | null>
  isCreating: ComputedRef<boolean>
  /** Validates `from` and pushes the next step (skipping date/time when prefilled). */
  next: (from: WizardStep) => void
  /** Pops back to an earlier step already in the stack. */
  goTo: (step: WizardStep) => void
  close: () => void
  create: () => Promise<void>
}

export const APPOINTMENT_WIZARD_MOBILE_KEY: InjectionKey<AppointmentWizardMobileContext> = Symbol(
  'appointment-wizard-mobile',
)

export function useAppointmentWizardMobile(): AppointmentWizardMobileContext {
  const context = inject(APPOINTMENT_WIZARD_MOBILE_KEY)
  if (!context) throw new Error('useAppointmentWizardMobile: wizard context is not provided')
  return context
}
