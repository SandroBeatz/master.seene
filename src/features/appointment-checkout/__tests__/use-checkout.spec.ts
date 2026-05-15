import { describe, expect, it } from 'vitest'
import type { Appointment } from '@entities/appointment'
import type { PaymentType } from '@entities/payment-type'
import type { Service } from '@entities/service'
import { useCheckout } from '../model/use-checkout'

const makeAppointment = (overrides?: Partial<Appointment>): Appointment => ({
  id: 'appt-1',
  user_id: 'user-1',
  client_id: 'client-1',
  service_ids: ['svc-1', 'svc-2'],
  start_at: '2026-05-15T10:00:00Z',
  duration: 60,
  price: null,
  status: 'confirmed',
  notes: null,
  created_at: '2026-05-15T09:00:00Z',
  updated_at: '2026-05-15T09:00:00Z',
  ...overrides,
})

const makeService = (id: string, price: number): Service => ({
  id,
  user_id: 'user-1',
  category_id: null,
  name: `Service ${id}`,
  description: null,
  duration: 30,
  price,
  color: '#a78bfa',
  is_active: true,
  sort_order: 0,
  created_at: '2026-05-15T09:00:00Z',
  updated_at: '2026-05-15T09:00:00Z',
})

const makePaymentType = (id: string, isDefault = false): PaymentType => ({
  id,
  user_id: 'user-1',
  name: `Type ${id}`,
  color: '#4ade80',
  is_default: isDefault,
  sort_order: 0,
  created_at: '2026-05-15T09:00:00Z',
  updated_at: '2026-05-15T09:00:00Z',
})

describe('useCheckout', () => {
  it('initializes serviceAmounts to each service price', () => {
    const { serviceAmounts } = useCheckout(
      makeAppointment(),
      [makeService('svc-1', 1200), makeService('svc-2', 800)],
      [makePaymentType('pt-1', true)],
    )
    expect(serviceAmounts.value).toEqual([1200, 800])
  })

  it('total is the sum of serviceAmounts', () => {
    const { total } = useCheckout(
      makeAppointment(),
      [makeService('svc-1', 1200), makeService('svc-2', 800)],
      [makePaymentType('pt-1', true)],
    )
    expect(total.value).toBe(2000)
  })

  it('total updates reactively when a serviceAmount changes', () => {
    const { serviceAmounts, total } = useCheckout(
      makeAppointment(),
      [makeService('svc-1', 1200), makeService('svc-2', 800)],
      [makePaymentType('pt-1', true)],
    )
    serviceAmounts.value[0] = 900
    expect(total.value).toBe(1700)
  })

  it('falls back to [appointment.price] when no services', () => {
    const { serviceAmounts } = useCheckout(
      makeAppointment({ price: 1500 }),
      [],
      [makePaymentType('pt-1', true)],
    )
    expect(serviceAmounts.value).toEqual([1500])
  })

  it('defaults to [0] when no services and appointment.price is null', () => {
    const { serviceAmounts } = useCheckout(
      makeAppointment({ price: null }),
      [],
      [makePaymentType('pt-1', true)],
    )
    expect(serviceAmounts.value).toEqual([0])
  })

  it('pre-selects the default payment type', () => {
    const { selectedPaymentTypeId } = useCheckout(
      makeAppointment(),
      [],
      [makePaymentType('pt-1', false), makePaymentType('pt-2', true)],
    )
    expect(selectedPaymentTypeId.value).toBe('pt-2')
  })

  it('pre-selects first type when none is marked as default', () => {
    const { selectedPaymentTypeId } = useCheckout(
      makeAppointment(),
      [],
      [makePaymentType('pt-1', false), makePaymentType('pt-2', false)],
    )
    expect(selectedPaymentTypeId.value).toBe('pt-1')
  })

  it('selectedPaymentTypeId is null when no payment types exist', () => {
    const { selectedPaymentTypeId } = useCheckout(makeAppointment(), [], [])
    expect(selectedPaymentTypeId.value).toBeNull()
  })

  it('canSubmit is false when total is 0', () => {
    const { canSubmit } = useCheckout(
      makeAppointment({ price: null }),
      [],
      [makePaymentType('pt-1', true)],
    )
    expect(canSubmit.value).toBe(false)
  })

  it('canSubmit is false when any serviceAmount is negative', () => {
    const { serviceAmounts, canSubmit } = useCheckout(
      makeAppointment(),
      [makeService('svc-1', 1200), makeService('svc-2', 800)],
      [makePaymentType('pt-1', true)],
    )
    serviceAmounts.value[0] = -10
    expect(canSubmit.value).toBe(false)
  })

  it('canSubmit is false when no payment type selected', () => {
    const { selectedPaymentTypeId, canSubmit } = useCheckout(
      makeAppointment({ price: 1000 }),
      [],
      [],
    )
    selectedPaymentTypeId.value = null
    expect(canSubmit.value).toBe(false)
  })

  it('canSubmit is true when total > 0 and payment type is selected', () => {
    const { canSubmit } = useCheckout(
      makeAppointment(),
      [makeService('svc-1', 1000)],
      [makePaymentType('pt-1', true)],
    )
    expect(canSubmit.value).toBe(true)
  })

  it('buildPayload uses serviceAmounts as item prices and total as sale amount', () => {
    const services = [makeService('svc-1', 1200), makeService('svc-2', 800)]
    const { serviceAmounts, buildPayload } = useCheckout(
      makeAppointment(),
      services,
      [makePaymentType('pt-1', true)],
    )
    serviceAmounts.value[0] = 1000
    expect(buildPayload()).toEqual({
      appointment_id: 'appt-1',
      amount: 1800,
      payment_type_id: 'pt-1',
      items: [
        { service_id: 'svc-1', name: 'Service svc-1', price: 1000 },
        { service_id: 'svc-2', name: 'Service svc-2', price: 800 },
      ],
    })
  })
})
