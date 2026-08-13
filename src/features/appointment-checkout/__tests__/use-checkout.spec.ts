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
  source: 'manual',
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

const makePaymentType = (id: string, isDefault = false, isActive = true): PaymentType => ({
  id,
  user_id: 'user-1',
  name: `Type ${id}`,
  color: '#4ade80',
  kind: 'custom',
  is_default: isDefault,
  is_active: isActive,
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

  it('skips an inactive default and pre-selects the first active type', () => {
    const { selectedPaymentTypeId } = useCheckout(
      makeAppointment(),
      [],
      [makePaymentType('pt-1', true, false), makePaymentType('pt-2', false, true)],
    )
    expect(selectedPaymentTypeId.value).toBe('pt-2')
  })

  it('selectedPaymentTypeId is null when every payment type is inactive', () => {
    const { selectedPaymentTypeId, canSubmit } = useCheckout(
      makeAppointment(),
      [makeService('svc-1', 1000)],
      [makePaymentType('pt-1', true, false), makePaymentType('pt-2', false, false)],
    )
    expect(selectedPaymentTypeId.value).toBeNull()
    expect(canSubmit.value).toBe(false)
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

  it('setting total redistributes service amounts proportionally', () => {
    const { serviceAmounts, total } = useCheckout(
      makeAppointment(),
      [makeService('svc-1', 1200), makeService('svc-2', 800)],
      [makePaymentType('pt-1', true)],
    )
    // 1200:800 == 60%:40% of 2000; doubling to 4000 keeps the ratio.
    total.value = 4000
    expect(serviceAmounts.value).toEqual([2400, 1600])
    expect(total.value).toBe(4000)
  })

  it('redistribution absorbs rounding drift so parts always sum to the total', () => {
    const { serviceAmounts, total } = useCheckout(
      makeAppointment({ service_ids: ['svc-1', 'svc-2', 'svc-3'] }),
      [makeService('svc-1', 100), makeService('svc-2', 100), makeService('svc-3', 100)],
      [makePaymentType('pt-1', true)],
    )
    // 100 / 3 does not divide evenly — parts must still add up exactly.
    total.value = 100
    expect(serviceAmounts.value.reduce((s, a) => s + a, 0)).toBe(100)
    expect(total.value).toBe(100)
  })

  it('splits evenly when all current amounts are zero', () => {
    const { serviceAmounts, total } = useCheckout(
      makeAppointment(),
      [makeService('svc-1', 0), makeService('svc-2', 0)],
      [makePaymentType('pt-1', true)],
    )
    total.value = 1000
    expect(serviceAmounts.value).toEqual([500, 500])
  })

  it('rounds to two decimals when redistributing (default currency precision)', () => {
    const { serviceAmounts, total } = useCheckout(
      makeAppointment(),
      [makeService('svc-1', 10), makeService('svc-2', 20)],
      [makePaymentType('pt-1', true)],
    )
    total.value = 100
    // 10:20 of 100 -> 33.33 : 66.67 (drift on the last), summing to exactly 100.
    expect(serviceAmounts.value[0]).toBeCloseTo(33.33, 2)
    expect(serviceAmounts.value.reduce((s, a) => s + a, 0)).toBe(100)
  })

  it('editing a single service amount keeps total as the sum', () => {
    const { serviceAmounts, total } = useCheckout(
      makeAppointment(),
      [makeService('svc-1', 1200), makeService('svc-2', 800)],
      [makePaymentType('pt-1', true)],
    )
    serviceAmounts.value[0] = 500
    expect(total.value).toBe(1300)
  })

  it('setting total to zero zeroes out every service amount', () => {
    const { serviceAmounts, total } = useCheckout(
      makeAppointment(),
      [makeService('svc-1', 1200), makeService('svc-2', 800)],
      [makePaymentType('pt-1', true)],
    )
    total.value = 0
    expect(serviceAmounts.value).toEqual([0, 0])
  })

  it('buildPayload uses serviceAmounts as item prices and total as sale amount', () => {
    const services = [makeService('svc-1', 1200), makeService('svc-2', 800)]
    const { serviceAmounts, buildPayload } = useCheckout(makeAppointment(), services, [
      makePaymentType('pt-1', true),
    ])
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
