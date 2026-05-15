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
  const defaultAmount =
    services.length > 0
      ? services.reduce((sum, s) => sum + s.price, 0)
      : (appointment.price ?? 0)

  const amount = ref<number>(defaultAmount)

  const defaultPaymentType =
    paymentTypes.find((pt) => pt.is_default) ?? paymentTypes[0] ?? null
  const selectedPaymentTypeId = ref<string | null>(defaultPaymentType?.id ?? null)

  const canSubmit = computed(() => amount.value > 0 && selectedPaymentTypeId.value !== null)

  function buildPayload(): CompleteSaleDto {
    return {
      appointment_id: appointment.id,
      amount: amount.value,
      payment_type_id: selectedPaymentTypeId.value!,
      items: services.map((s) => ({
        service_id: s.id,
        name: s.name,
        price: s.price,
      })),
    }
  }

  return { amount, selectedPaymentTypeId, canSubmit, buildPayload }
}
