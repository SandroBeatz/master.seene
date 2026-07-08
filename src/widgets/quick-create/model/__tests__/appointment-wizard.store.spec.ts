import { describe, expect, it } from 'vitest'
import { createAppointmentWizard } from '../appointment-wizard.store'

const TZ = 'Asia/Singapore'

describe('createAppointmentWizard — gating', () => {
  it('blocks advancing until each step is valid', () => {
    const { state, canAdvance, next } = createAppointmentWizard({ timeZone: TZ })

    expect(state.step).toBe(1)
    expect(canAdvance.value).toBe(false)
    next()
    expect(state.step).toBe(1) // still blocked

    state.clientId = 'c1'
    expect(canAdvance.value).toBe(true)
    next()
    expect(state.step).toBe(2)

    expect(canAdvance.value).toBe(false) // no services
    next()
    expect(state.step).toBe(2)

    state.serviceIds = ['s1']
    next()
    expect(state.step).toBe(3)

    expect(canAdvance.value).toBe(false) // no slot
    next()
    expect(state.step).toBe(3)

    state.slotMinutes = 600
    next()
    expect(state.step).toBe(4)
  })

  it('navigates back one step at a time', () => {
    const wizard = createAppointmentWizard({ timeZone: TZ })
    wizard.state.clientId = 'c1'
    wizard.state.serviceIds = ['s1']
    wizard.state.slotMinutes = 600
    wizard.next()
    wizard.next()
    wizard.next()
    expect(wizard.state.step).toBe(4)

    wizard.back()
    expect(wizard.state.step).toBe(3)
    wizard.back()
    expect(wizard.state.step).toBe(2)
  })

  it('only allows jumping to earlier steps', () => {
    const wizard = createAppointmentWizard({ timeZone: TZ })
    wizard.state.clientId = 'c1'
    wizard.next()
    expect(wizard.state.step).toBe(2)

    wizard.goTo(4) // forward — ignored
    expect(wizard.state.step).toBe(2)
    wizard.goTo(1) // backward — allowed
    expect(wizard.state.step).toBe(1)
  })
})

describe('createAppointmentWizard — slot prefill', () => {
  it('prefills date + slot and skips date/time (Services → Confirm)', () => {
    const wizard = createAppointmentWizard({
      timeZone: TZ,
      prefill: { startAt: '2026-07-08T02:30:00Z' }, // 10:30 SGT
    })

    expect(wizard.state.date).toBe('2026-07-08')
    expect(wizard.state.slotMinutes).toBe(630)
    expect(wizard.state.skipDateTime).toBe(true)

    wizard.state.clientId = 'c1'
    wizard.next() // 1 → 2
    expect(wizard.state.step).toBe(2)

    wizard.state.serviceIds = ['s1']
    wizard.next() // 2 → 4 (skips 3)
    expect(wizard.state.step).toBe(4)

    wizard.back() // 4 → 2 (skips 3)
    expect(wizard.state.step).toBe(2)
  })

  it('has no skip when opened without a prefill', () => {
    const wizard = createAppointmentWizard({ timeZone: TZ })
    expect(wizard.state.skipDateTime).toBe(false)
    expect(wizard.state.date).toBe('')
    expect(wizard.state.slotMinutes).toBeNull()
  })
})
