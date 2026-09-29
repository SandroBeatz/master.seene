import { computed, ref, shallowRef } from 'vue'
import type { Appointment } from '@entities/appointment'
import type { PaymentType } from '@entities/payment-type'
import type { Service } from '@entities/service'
import type { CompleteSaleDto } from '@entities/sale'
import { getMostUsedPaymentTypeId, recordPaymentUsage } from './frequent-payment'

export interface UseCheckoutOptions {
  /** Decimal places of the active currency; drives rounding when redistributing the total. */
  decimals?: number
}

/** Round to `decimals` places, nudging past float error (e.g. 0.1 + 0.2). */
function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function useCheckout(
  appointment: Appointment,
  services: Service[],
  paymentTypes: PaymentType[],
  options?: UseCheckoutOptions,
) {
  const decimals = options?.decimals ?? 2
  const activeAppointment = shallowRef(appointment)
  const checkoutServices = ref<Service[]>([...services])

  const serviceAmounts = ref<number[]>(
    services.length > 0 ? services.map((s) => s.price) : [appointment.price ?? 0],
  )

  // Writable: reading sums the per-service amounts; writing redistributes the new
  // total across services proportionally to their current share (evenly if all zero).
  const total = computed<number>({
    get: () =>
      roundTo(
        serviceAmounts.value.reduce((sum, a) => sum + a, 0),
        decimals,
      ),
    set: (newTotal) => distributeTotal(newTotal),
  })

  function distributeTotal(newTotal: number) {
    const amounts = serviceAmounts.value
    const n = amounts.length
    if (n === 0) return

    const target = Math.max(0, roundTo(newTotal, decimals))
    const current = amounts.reduce((sum, a) => sum + a, 0)

    const next =
      current <= 0
        ? // No basis for proportions — split evenly.
          Array.from({ length: n }, () => roundTo(target / n, decimals))
        : amounts.map((a) => roundTo((target * a) / current, decimals))

    // Absorb rounding drift into the last item so the parts always sum to `target`.
    const distributed = next.reduce((sum, a) => sum + a, 0)
    next[n - 1] = roundTo(next[n - 1]! + (target - distributed), decimals)

    serviceAmounts.value = next
  }

  function preferredPaymentTypeId(types: PaymentType[]): string | null {
    const activePaymentTypes = types.filter((pt) => pt.is_active)
    const frequentId = getMostUsedPaymentTypeId(activePaymentTypes.map((pt) => pt.id))
    const preselected =
      activePaymentTypes.find((pt) => pt.id === frequentId) ??
      activePaymentTypes.find((pt) => pt.is_default) ??
      activePaymentTypes[0] ??
      null
    return preselected?.id ?? null
  }

  // Only active methods can be used to pay. Prefer the method used most over the
  // last 5 days (front-only heuristic), then the master's default, then the first.
  const selectedPaymentTypeId = ref<string | null>(preferredPaymentTypeId(paymentTypes))

  const canSubmit = computed(
    () =>
      serviceAmounts.value.every((a) => a >= 0) &&
      total.value > 0 &&
      selectedPaymentTypeId.value !== null,
  )

  function buildPayload(): CompleteSaleDto {
    return {
      appointment_id: activeAppointment.value.id,
      amount: total.value,
      payment_type_id: selectedPaymentTypeId.value!,
      items: checkoutServices.value.map((s, i) => ({
        service_id: s.id,
        name: s.name,
        price: serviceAmounts.value[i] ?? 0,
      })),
    }
  }

  /** Log the chosen method so future checkouts can pre-select the frequent one. */
  function commitPaymentUsage() {
    if (selectedPaymentTypeId.value) recordPaymentUsage(selectedPaymentTypeId.value)
  }

  function setServices(nextServices: Service[]) {
    const previousAmounts = new Map(
      checkoutServices.value.map((service, index) => [service.id, serviceAmounts.value[index]]),
    )
    checkoutServices.value = [...nextServices]
    serviceAmounts.value = nextServices.map(
      (service) => previousAmounts.get(service.id) ?? service.price,
    )
  }

  function reset(
    nextAppointment: Appointment,
    nextServices: Service[],
    nextPaymentTypes: PaymentType[],
  ) {
    activeAppointment.value = nextAppointment
    checkoutServices.value = [...nextServices]
    serviceAmounts.value = nextServices.length
      ? nextServices.map((service) => service.price)
      : [nextAppointment.price ?? 0]
    selectedPaymentTypeId.value = preferredPaymentTypeId(nextPaymentTypes)
  }

  return {
    checkoutServices,
    serviceAmounts,
    total,
    selectedPaymentTypeId,
    canSubmit,
    buildPayload,
    commitPaymentUsage,
    setServices,
    reset,
  }
}
