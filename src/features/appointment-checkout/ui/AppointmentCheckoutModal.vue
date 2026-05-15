<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Appointment } from '@entities/appointment'
import type { PaymentType } from '@entities/payment-type'
import type { Service } from '@entities/service'
import type { CompleteSaleDto } from '@entities/sale'
import { useFormats } from '@shared/lib/formats'
import { useCheckout } from '../model/use-checkout'

const props = defineProps<{
  open: boolean
  appointment: Appointment
  services: Service[]
  paymentTypes: PaymentType[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [payload: CompleteSaleDto]
}>()

const { t } = useI18n()
const formats = useFormats()

const { serviceAmounts, total, selectedPaymentTypeId, canSubmit, buildPayload } = useCheckout(
  props.appointment,
  props.services,
  props.paymentTypes,
)

function handleConfirm() {
  if (!canSubmit.value) return
  emit('confirm', buildPayload())
}
</script>

<template>
  <UModal
    :open="open"
    :title="$t('checkout.title')"
    :ui="{ footer: 'justify-end' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-5">
        <!-- Services list -->
        <div v-if="services.length" class="space-y-2">
          <p class="text-xs font-semibold uppercase text-muted">
            {{ $t('checkout.services') }}
          </p>
          <div class="divide-y divide-default rounded-md border border-default">
            <div
              v-for="(service, i) in services"
              :key="service.id"
              class="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span class="flex-1 truncate">{{ service.name }}</span>
              <UInput
                v-if="services.length > 1"
                v-model.number="serviceAmounts[i]"
                type="number"
                min="0"
                step="1"
                size="sm"
                class="w-28"
              />
              <span v-else class="font-medium">{{ formats.price(service.price) }}</span>
            </div>
          </div>
        </div>

        <!-- Total amount -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold uppercase text-muted">
            {{ $t('checkout.total') }}
          </label>
          <p v-if="services.length > 1" class="py-2 text-xl font-semibold">
            {{ formats.price(total) }}
          </p>
          <UInput
            v-else
            v-model.number="serviceAmounts[0]"
            type="number"
            min="0"
            step="1"
            size="xl"
          />
        </div>

        <!-- Payment method -->
        <div class="space-y-2">
          <p class="text-xs font-semibold uppercase text-muted">
            {{ $t('checkout.paymentMethod') }}
          </p>
          <div v-if="paymentTypes.length" class="flex flex-wrap gap-2">
            <button
              v-for="pt in paymentTypes"
              :key="pt.id"
              type="button"
              class="rounded-md border px-4 py-2 text-sm font-medium transition-colors"
              :class="
                selectedPaymentTypeId === pt.id
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                  : 'border-default hover:border-primary-400'
              "
              @click="selectedPaymentTypeId = pt.id"
            >
              <span
                class="mr-1.5 inline-block h-2 w-2 rounded-full"
                :style="{ backgroundColor: pt.color }"
              />
              {{ pt.name }}
            </button>
          </div>
          <p v-else class="text-sm text-muted">
            {{ $t('checkout.noPaymentTypes') }}
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton color="neutral" variant="outline" @click="emit('update:open', false)">
        {{ $t('checkout.cancel') }}
      </UButton>
      <UButton
        color="success"
        leading-icon="i-lucide-badge-check"
        :disabled="!canSubmit"
        :loading="loading"
        @click="handleConfirm"
      >
        {{ $t('checkout.confirm') }}
      </UButton>
    </template>
  </UModal>
</template>
