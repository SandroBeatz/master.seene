import { computed, ref } from 'vue'
import type { Appointment } from '@entities/appointment'
import type { PaymentType } from '@entities/payment-type'
import type { Service } from '@entities/service'
import type { CompleteSaleDto } from '@entities/sale'

export function useCheckout(
  appointment: Appointment,
  services: Service[],
  paymentTypes: PaymentType[],
) {
  const serviceAmounts = ref<number[]>(
    services.length > 0
      ? services.map((s) => s.price)
      : [appointment.price ?? 0],
  )

  const total = computed(() => serviceAmounts.value.reduce((sum, a) => sum + a, 0))

  // Only active methods can be used to pay; pick the default among them, else the first active.
  const activePaymentTypes = paymentTypes.filter((pt) => pt.is_active)
  const defaultPaymentType =
    activePaymentTypes.find((pt) => pt.is_default) ?? activePaymentTypes[0] ?? null
  const selectedPaymentTypeId = ref<string | null>(defaultPaymentType?.id ?? null)

  const canSubmit = computed(
    () =>
      serviceAmounts.value.every((a) => a >= 0) &&
      total.value > 0 &&
      selectedPaymentTypeId.value !== null,
  )

  function buildPayload(): CompleteSaleDto {
    return {
      appointment_id: appointment.id,
      amount: total.value,
      payment_type_id: selectedPaymentTypeId.value!,
      items: services.map((s, i) => ({
        service_id: s.id,
        name: s.name,
        price: serviceAmounts.value[i] ?? 0,
      })),
    }
  }

  return { serviceAmounts, total, selectedPaymentTypeId, canSubmit, buildPayload }
}
