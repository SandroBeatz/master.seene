import { computed, reactive } from 'vue'
import { getDateTimeInputValue } from '@shared/lib/time-zone'
import { timeInputToMinutes } from '../lib/calendar-date'
import type { AppointmentPrefill } from './types'

export type WizardStep = 1 | 2 | 3 | 4

export interface AppointmentWizardState {
  step: WizardStep
  clientId: string | null
  serviceIds: string[]
  /** Selected day, `YYYY-MM-DD` in the master's timezone. */
  date: string
  /** Selected start, minutes since midnight. */
  slotMinutes: number | null
  /** Master-edited price; `null` falls back to the sum of service prices. */
  price: number | null
  priceOverridden: boolean
  notes: string
  /** Slot-click prefilled Step 3 → jump Services → Confirm. */
  skipDateTime: boolean
}

export interface CreateWizardOptions {
  prefill?: AppointmentPrefill
  timeZone: string
}

/**
 * Local, overlay-scoped wizard state + step gating (no global Pinia, no data
 * fetching — the component supplies clients/services/availability). Kept pure so
 * the branching (gating, prefill skip, back navigation) is unit-testable.
 */
export function createAppointmentWizard(options: CreateWizardOptions) {
  const { prefill, timeZone } = options

  let initialDate = ''
  let initialSlot: number | null = null
  let skip = false
  if (prefill?.startAt) {
    const { date, time } = getDateTimeInputValue(prefill.startAt, timeZone)
    initialDate = date
    initialSlot = time ? timeInputToMinutes(time) : null
    skip = Boolean(date)
  }

  const state = reactive<AppointmentWizardState>({
    step: 1,
    clientId: null,
    serviceIds: [],
    date: initialDate,
    slotMinutes: initialSlot,
    price: null,
    priceOverridden: false,
    notes: '',
    skipDateTime: skip,
  })

  const isStep1Valid = computed(() => Boolean(state.clientId))
  const isStep2Valid = computed(() => state.serviceIds.length > 0)
  const isStep3Valid = computed(() => state.slotMinutes != null)

  /** Whether the current step's Next/Create is allowed. */
  const canAdvance = computed(() => {
    if (state.step === 1) return isStep1Valid.value
    if (state.step === 2) return isStep2Valid.value
    if (state.step === 3) return isStep3Valid.value
    return true
  })

  function next() {
    if (!canAdvance.value) return
    if (state.step === 2 && state.skipDateTime) {
      state.step = 4
      return
    }
    if (state.step < 4) state.step = (state.step + 1) as WizardStep
  }

  function back() {
    if (state.step === 4 && state.skipDateTime) {
      state.step = 2
      return
    }
    if (state.step > 1) state.step = (state.step - 1) as WizardStep
  }

  /** Jump to an already-completed (earlier) step; forward jumps are ignored. */
  function goTo(target: WizardStep) {
    if (target < state.step) state.step = target
  }

  return { state, isStep1Valid, isStep2Valid, isStep3Valid, canAdvance, next, back, goTo }
}

export type AppointmentWizard = ReturnType<typeof createAppointmentWizard>
