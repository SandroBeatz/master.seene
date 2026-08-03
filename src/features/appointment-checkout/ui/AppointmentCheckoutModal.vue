<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { createReusableTemplate } from '@vueuse/core'
import type { Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'
import { ClientAvatar } from '@entities/client'
import type { PaymentType } from '@entities/payment-type'
import type { Service } from '@entities/service'
import type { CompleteSaleDto } from '@entities/sale'
import { useFormats } from '@shared/lib/formats'
import { useIsMobile } from '@shared/lib/viewport'
import { PriceInput } from '@shared/ui/price-input'
import { useCheckout } from '../model/use-checkout'

// Share the body/footer markup between the desktop modal and the mobile drawer.
const [DefineBody, ReuseBody] = createReusableTemplate()
const [DefineFooter, ReuseFooter] = createReusableTemplate()

const props = defineProps<{
  open: boolean
  appointment: Appointment
  client?: Client | null
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
const isMobile = useIsMobile()

const {
  serviceAmounts,
  total,
  selectedPaymentTypeId,
  canSubmit,
  buildPayload,
  commitPaymentUsage,
} = useCheckout(props.appointment, props.services, props.paymentTypes, {
  decimals: formats.currency().decimals,
})

const clientName = computed(() => {
  if (!props.client) return ''
  return [props.client.first_name, props.client.last_name].filter(Boolean).join(' ')
})

// Only active methods can be used to pay.
const activePaymentTypes = computed(() => props.paymentTypes.filter((pt) => pt.is_active))

function methodLabel(pt: PaymentType): string {
  if (pt.kind === 'cash') return t('settings.paymentTypes.system.cash.name')
  if (pt.kind === 'card') return t('settings.paymentTypes.system.card.name')
  return pt.name
}

function handleConfirm() {
  if (!canSubmit.value) return
  commitPaymentUsage()
  emit('confirm', buildPayload())
}
</script>

<template>
  <DefineBody>
    <div class="space-y-5">
      <!-- Client -->
      <div v-if="clientName" class="flex items-center gap-3">
        <ClientAvatar
          :first-name="client?.first_name"
          :last-name="client?.last_name"
          :seed="appointment.client_id"
          size="lg"
        />
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase text-muted">
            {{ $t('checkout.client') }}
          </p>
          <p class="truncate font-medium">{{ clientName }}</p>
        </div>
      </div>

      <!-- Services list -->
      <div v-if="services.length" class="space-y-2">
        <p class="text-xs font-semibold uppercase text-muted">
          {{ $t('checkout.services') }}
        </p>
        <div class="space-y-2">
          <div
            v-for="(service, i) in services"
            :key="service.id"
            class="flex items-center justify-between gap-3 text-sm"
          >
            <span class="flex-1 truncate">{{ service.name }}</span>
            <PriceInput
              :model-value="serviceAmounts[i] ?? null"
              class="w-32"
              @update:model-value="serviceAmounts[i] = $event ?? 0"
            />
          </div>
        </div>
      </div>

      <!-- Total amount (editable — rebalances service prices proportionally) -->
      <div v-if="services.length > 1" class="space-y-3">
        <USeparator />
        <div class="flex items-center justify-between gap-3">
          <label class="text-xs font-semibold uppercase text-muted">
            {{ $t('checkout.total') }}
          </label>
          <PriceInput :model-value="total" class="w-32" @update:model-value="total = $event ?? 0" />
        </div>
      </div>

      <!-- Payment method -->
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase text-muted">
          {{ $t('checkout.paymentMethod') }}
        </p>
        <div v-if="activePaymentTypes.length" class="flex flex-wrap gap-2">
          <button
            v-for="pt in activePaymentTypes"
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
            {{ methodLabel(pt) }}
          </button>
        </div>
        <p v-else class="text-sm text-muted">
          {{ $t('checkout.noPaymentTypes') }}
        </p>
      </div>
    </div>
  </DefineBody>

  <DefineFooter>
    <UButton
      color="success"
      leading-icon="i-lucide-check-check"
      block
      :disabled="!canSubmit"
      :loading="loading"
      @click="handleConfirm"
    >
      {{ $t('checkout.confirm') }}
    </UButton>
  </DefineFooter>

  <!-- Mobile: bottom drawer -->
  <UDrawer
    v-if="isMobile"
    :open="open"
    :title="$t('checkout.title')"
    :ui="{
      content: 'rounded-t-2xl',
      body: 'pb-[calc(1rem+var(--safe-area-bottom))]',
      footer: 'pb-[calc(1rem+var(--safe-area-bottom))]',
    }"
    @update:open="emit('update:open', $event)"
  >
    <template #body><ReuseBody /></template>
    <template #footer><ReuseFooter /></template>
  </UDrawer>

  <!-- Desktop: modal -->
  <UModal
    v-else
    :open="open"
    :title="$t('checkout.title')"
    :ui="{ footer: 'justify-end' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body><ReuseBody /></template>
    <template #footer><ReuseFooter /></template>
  </UModal>
</template>
