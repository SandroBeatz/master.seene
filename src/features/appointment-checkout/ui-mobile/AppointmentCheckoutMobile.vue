<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonAvatar,
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
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import {
  cardOutline,
  cashOutline,
  checkmarkDoneOutline,
  closeOutline,
  createOutline,
  walletOutline,
} from 'ionicons/icons'
import type { Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'
import type { PaymentType } from '@entities/payment-type'
import { ServicePickerModalMobile, type Service } from '@entities/service/index.mobile'
import type { CompleteSaleDto } from '@entities/sale'
import { useFormats } from '@shared/lib/formats'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import { useCheckout } from '../model/use-checkout'
import { ButtonSpinner } from '@shared/ui/button-spinner/index.mobile'

const props = defineProps<{
  isOpen: boolean
  appointment: Appointment
  client?: Client | null
  services: Service[]
  availableServices?: Service[]
  paymentTypes: PaymentType[]
  presentingElement?: HTMLElement | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  confirm: [payload: CompleteSaleDto]
  'did-dismiss': []
}>()

const { t } = useI18n()
const formats = useFormats()
const selfModal = ref<{ $el: HTMLElement } | null>(null)
const selfModalEl = computed(() => selfModal.value?.$el ?? null)
const isServicePickerOpen = ref(false)
const clientName = computed(() =>
  props.client
    ? [props.client.first_name, props.client.last_name].filter(Boolean).join(' ')
    : t('appointments.unknownClient'),
)
const clientInitials = computed(() => {
  const initials = clientName.value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  return initials || '—'
})
const allServices = computed(() => props.availableServices ?? props.services)
const activePaymentTypes = computed(() => props.paymentTypes.filter((type) => type.is_active))

const {
  checkoutServices,
  serviceAmounts,
  total,
  selectedPaymentTypeId,
  canSubmit,
  buildPayload,
  commitPaymentUsage,
  setServices,
  reset,
} = useCheckout(props.appointment, props.services, props.paymentTypes, {
  decimals: formats.currency().decimals,
})

const canConfirm = computed(() => canSubmit.value && !props.loading)

function paymentTypeLabel(type: PaymentType): string {
  if (type.kind === 'cash') return t('settings.paymentTypes.system.cash.name')
  if (type.kind === 'card') return t('settings.paymentTypes.system.card.name')
  return type.name
}

function paymentTypeIcon(type: PaymentType): string {
  if (type.kind === 'cash') return cashOutline
  if (type.kind === 'card') return cardOutline
  return walletOutline
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

function onServicesSelect(services: Service[]) {
  setServices(services)
}

function close() {
  if (props.loading) return
  emit('update:isOpen', false)
}

async function canDismiss(): Promise<boolean> {
  // Ionic checks canDismiss even when the controlled isOpen prop switches to
  // false. Always allow that parent-driven transition while still blocking
  // gestures/backdrop dismissal during the mutation.
  return !props.loading || !props.isOpen
}

function submit() {
  if (!canConfirm.value) return
  commitPaymentUsage()
  emit('confirm', buildPayload())
}

function onDidDismiss() {
  isServicePickerOpen.value = false
  emit('update:isOpen', false)
  emit('did-dismiss')
}

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return
    reset(props.appointment, props.services, props.paymentTypes)
    isServicePickerOpen.value = false
  },
  { immediate: true },
)
</script>

<template>
  <ion-modal
    ref="selfModal"
    :is-open="isOpen"
    class="appointment-checkout-mobile"
    :presenting-element="presentingElement ?? undefined"
    :can-dismiss="canDismiss"
    @did-dismiss="onDidDismiss"
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

    <ion-content class="appointment-checkout-mobile__content ion-padding-vertical">
      <section class="appointment-checkout-mobile__client">
        <ion-avatar class="appointment-checkout-mobile__avatar" aria-hidden="true">
          <span v-if="client?.emoji" class="appointment-checkout-mobile__emoji">
            {{ client.emoji }}
          </span>
          <span v-else>{{ clientInitials }}</span>
        </ion-avatar>
        <h2>{{ clientName }}</h2>
      </section>

      <inset-list>
        <template #header>
          <div class="appointment-checkout-mobile__section-header">
            <span>{{ t('checkout.services') }}</span>
            <ion-button
              fill="clear"
              size="small"
              :disabled="loading"
              :aria-label="t('common.edit')"
              @click="isServicePickerOpen = true"
            >
              <ion-icon slot="start" :icon="createOutline" aria-hidden="true" />
              {{ t('common.edit') }}
            </ion-button>
          </div>
        </template>

        <ion-item v-for="(service, index) in checkoutServices" :key="service.id" lines="full">
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
        <ion-item lines="none" class="appointment-checkout-mobile__total">
          <ion-label>
            <strong>{{ t('checkout.total') }}</strong>
          </ion-label>
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
            class="appointment-checkout-mobile__payment-item"
            :class="{
              'appointment-checkout-mobile__payment-item--selected':
                selectedPaymentTypeId === type.id,
            }"
            :aria-pressed="selectedPaymentTypeId === type.id"
            @click="selectedPaymentTypeId = type.id"
          >
            <span
              slot="start"
              class="appointment-checkout-mobile__payment-icon"
              :style="{ '--payment-color': type.color }"
              aria-hidden="true"
            >
              <ion-icon :icon="paymentTypeIcon(type)" />
            </span>
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
          <button-spinner v-if="loading" slot="start" />
          <ion-icon v-else slot="start" :icon="checkmarkDoneOutline" aria-hidden="true" />
          {{ t('checkout.confirm') }}
        </ion-button>
      </ion-toolbar>
    </ion-footer>

    <service-picker-modal-mobile
      v-model:is-open="isServicePickerOpen"
      :model-value="checkoutServices.map((service) => service.id)"
      :services="allServices"
      :presenting-element="selfModalEl"
      @select="onServicesSelect"
    />
  </ion-modal>
</template>

<style scoped>
.appointment-checkout-mobile ion-toolbar,
.appointment-checkout-mobile__content {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.appointment-checkout-mobile__client {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 2px 24px 24px;
  text-align: center;
}

.appointment-checkout-mobile__client h2 {
  max-width: 100%;
  margin: 0;
  overflow: hidden;
  font-size: 1.1rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.appointment-checkout-mobile__avatar {
  display: grid;
  width: 64px;
  height: 64px;
  background: var(--ion-background-color-step-150, var(--se-surface-card));
  color: var(--ion-text-color);
  place-items: center;
  font-size: 1.25rem;
  font-weight: 750;
}

.appointment-checkout-mobile__emoji {
  font-size: 1.7rem;
  font-weight: 400;
}

.appointment-checkout-mobile__section-header {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.appointment-checkout-mobile__section-header ion-button {
  min-height: 44px;
  margin: -10px -10px -7px 0;
  text-transform: none;
}

.appointment-checkout-mobile__section-header ion-icon[slot='start'] {
  margin-inline-end: 5px;
}

.appointment-checkout-mobile__service-dot {
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

.appointment-checkout-mobile__total {
  --background: var(--ion-background-color-step-50, transparent);

  font-size: 1rem;
}

.appointment-checkout-mobile__payment-item--selected {
  --background: rgba(var(--ion-color-primary-rgb), 0.08);
}

.appointment-checkout-mobile__payment-icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  margin-inline: 0 var(--se-list-icon-gap, 12px);
  border-radius: 10px;
  background: var(--payment-color, var(--ion-color-medium));
  color: var(--se-surface-card, var(--ion-background-color));
  place-items: center;
  font-size: 18px;
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
