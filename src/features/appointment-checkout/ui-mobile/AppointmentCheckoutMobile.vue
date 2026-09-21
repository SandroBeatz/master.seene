<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonNote,
  IonRadio,
  IonRadioGroup,
  IonSpinner,
  IonTitle,
  IonToolbar,
  isPlatform,
} from '@ionic/vue'
import { checkmarkDoneOutline, closeOutline } from 'ionicons/icons'
import type { Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'
import type { PaymentType } from '@entities/payment-type'
import type { Service } from '@entities/service'
import type { CompleteSaleDto } from '@entities/sale'
import { useFormats } from '@shared/lib/formats'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import { useCheckout } from '../model/use-checkout'

const props = defineProps<{
  isOpen: boolean
  appointment: Appointment
  client?: Client | null
  services: Service[]
  paymentTypes: PaymentType[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  confirm: [payload: CompleteSaleDto]
}>()

const { t } = useI18n()
const formats = useFormats()
const spinnerName = isPlatform('ios') ? 'dots' : 'crescent'
const clientName = computed(() =>
  props.client
    ? [props.client.first_name, props.client.last_name].filter(Boolean).join(' ')
    : t('appointments.unknownClient'),
)
const activePaymentTypes = computed(() => props.paymentTypes.filter((type) => type.is_active))

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

const canConfirm = computed(() => canSubmit.value && !props.loading)

function paymentTypeLabel(type: PaymentType): string {
  if (type.kind === 'cash') return t('settings.paymentTypes.system.cash.name')
  if (type.kind === 'card') return t('settings.paymentTypes.system.card.name')
  return type.name
}

function readNumber(event: CustomEvent<{ value?: string | null }>): number {
  const value = Number(event.detail.value)
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function setServiceAmount(index: number, event: CustomEvent<{ value?: string | null }>) {
  serviceAmounts.value[index] = readNumber(event)
}

function setTotal(event: CustomEvent<{ value?: string | null }>) {
  total.value = readNumber(event)
}

function close() {
  if (props.loading) return
  emit('update:isOpen', false)
}

function submit() {
  if (!canConfirm.value) return
  commitPaymentUsage()
  emit('confirm', buildPayload())
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    class="appointment-checkout-mobile"
    :breakpoints="[0, 0.86, 1]"
    :initial-breakpoint="0.86"
    :handle="!loading"
    :can-dismiss="!loading"
    @did-dismiss="emit('update:isOpen', false)"
  >
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button
            fill="clear"
            color="dark"
            :disabled="loading"
            :aria-label="t('common.close')"
            @click="close"
          >
            <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ t('checkout.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="appointment-checkout-mobile__content">
      <inset-list :header="t('checkout.client')">
        <ion-item lines="none">
          <ion-label>{{ clientName }}</ion-label>
        </ion-item>
      </inset-list>

      <inset-list :header="t('checkout.services')">
        <ion-item v-for="(service, index) in services" :key="service.id" lines="full">
          <span
            slot="start"
            class="appointment-checkout-mobile__service-dot"
            :style="{ backgroundColor: service.color }"
            aria-hidden="true"
          />
          <ion-label class="ion-text-wrap">{{ service.name }}</ion-label>
          <ion-input
            slot="end"
            class="appointment-checkout-mobile__amount"
            type="number"
            inputmode="decimal"
            min="0"
            :value="serviceAmounts[index]"
            :aria-label="`${service.name}: ${t('appointments.preview.price')}`"
            @ion-input="setServiceAmount(index, $event)"
          />
        </ion-item>
        <ion-item v-if="services.length > 1" lines="none" class="total-item">
          <ion-label
            ><strong>{{ t('checkout.total') }}</strong></ion-label
          >
          <ion-input
            slot="end"
            class="appointment-checkout-mobile__amount"
            type="number"
            inputmode="decimal"
            min="0"
            :value="total"
            :aria-label="t('checkout.total')"
            @ion-input="setTotal"
          />
        </ion-item>
      </inset-list>

      <inset-list :header="t('checkout.paymentMethod')">
        <ion-radio-group v-if="activePaymentTypes.length" v-model="selectedPaymentTypeId">
          <ion-item
            v-for="type in activePaymentTypes"
            :key="type.id"
            button
            :detail="false"
            lines="full"
            @click="selectedPaymentTypeId = type.id"
          >
            <span
              slot="start"
              class="appointment-checkout-mobile__payment-dot"
              :style="{ backgroundColor: type.color }"
              aria-hidden="true"
            />
            <ion-label>{{ paymentTypeLabel(type) }}</ion-label>
            <ion-radio slot="end" :value="type.id" :aria-label="paymentTypeLabel(type)" />
          </ion-item>
        </ion-radio-group>
        <ion-item v-else lines="none">
          <ion-note color="medium" class="ion-text-wrap">
            {{ t('checkout.noPaymentTypes') }}
          </ion-note>
        </ion-item>
      </inset-list>
    </ion-content>

    <ion-footer class="ion-no-border">
      <ion-toolbar>
        <ion-button
          class="appointment-checkout-mobile__submit"
          expand="block"
          color="primary"
          :disabled="!canConfirm"
          :aria-busy="loading"
          @click="submit"
        >
          <ion-spinner v-if="loading" slot="start" :name="spinnerName" />
          <ion-icon v-else slot="start" :icon="checkmarkDoneOutline" aria-hidden="true" />
          {{ t('checkout.confirm') }}
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<style scoped>
.appointment-checkout-mobile {
  --border-radius: 20px 20px 0 0;
}

.appointment-checkout-mobile ion-toolbar,
.appointment-checkout-mobile__content {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.appointment-checkout-mobile__service-dot,
.appointment-checkout-mobile__payment-dot {
  width: 11px;
  height: 11px;
  margin-inline-end: 12px;
  border-radius: 999px;
  flex-shrink: 0;
}

.appointment-checkout-mobile__amount {
  width: 105px;
  max-width: 105px;
  text-align: end;
}

.total-item {
  font-size: 1rem;
}

.appointment-checkout-mobile__submit {
  --border-radius: 12px;

  min-height: 48px;
  margin: 8px 14px calc(8px + var(--safe-area-bottom, 0px));
  text-transform: none;
}

.appointment-checkout-mobile__submit ion-icon[slot='start'],
.appointment-checkout-mobile__submit ion-spinner[slot='start'] {
  margin-inline-end: 7px;
}
</style>
