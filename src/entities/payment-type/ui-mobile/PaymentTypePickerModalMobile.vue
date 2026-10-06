<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonModal,
  IonNote,
  IonRadio,
  IonRadioGroup,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { cardOutline, cashOutline, closeOutline, walletOutline } from 'ionicons/icons'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import type { PaymentType } from '../model/types'

const props = defineProps<{
  isOpen: boolean
  paymentTypes: PaymentType[]
  modelValue: string | null
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  'update:modelValue': [value: string]
  select: [paymentType: PaymentType]
}>()

const { t } = useI18n()
const draftId = ref<string | null>(null)
const availablePaymentTypes = computed(() =>
  props.paymentTypes.filter((type) => type.is_active || type.id === props.modelValue),
)

watch(
  () => props.isOpen,
  (open) => {
    if (open) draftId.value = props.modelValue
  },
  { immediate: true },
)

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

function close() {
  emit('update:isOpen', false)
}

function select(paymentType: PaymentType) {
  draftId.value = paymentType.id
  if (paymentType.id !== props.modelValue) {
    emit('update:modelValue', paymentType.id)
    emit('select', paymentType)
  }
  close()
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    class="payment-type-picker-modal"
    :presenting-element="presentingElement ?? undefined"
    @did-dismiss="close"
  >
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button fill="clear" color="dark" :aria-label="t('common.close')" @click="close">
            <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ t('checkout.paymentMethod') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="payment-type-picker-modal__content ion-padding-vertical">
      <inset-list v-if="availablePaymentTypes.length">
        <ion-radio-group v-model="draftId">
          <ion-item
            v-for="paymentType in availablePaymentTypes"
            :key="paymentType.id"
            button
            :detail="false"
            :aria-pressed="paymentType.id === draftId"
            :data-testid="`payment-type-picker-item-${paymentType.id}`"
            @click="select(paymentType)"
          >
            <span
              slot="start"
              class="payment-type-picker-modal__icon"
              :style="{ '--payment-color': paymentType.color }"
              aria-hidden="true"
            >
              <ion-icon :icon="paymentTypeIcon(paymentType)" />
            </span>
            <ion-label>{{ paymentTypeLabel(paymentType) }}</ion-label>
            <ion-radio
              slot="end"
              :value="paymentType.id"
              :aria-label="paymentTypeLabel(paymentType)"
            />
          </ion-item>
        </ion-radio-group>
      </inset-list>

      <inset-list v-else>
        <ion-item lines="none">
          <ion-note color="medium" class="ion-text-wrap">
            {{ t('checkout.noPaymentTypes') }}
          </ion-note>
        </ion-item>
      </inset-list>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.payment-type-picker-modal ion-toolbar,
.payment-type-picker-modal__content {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.payment-type-picker-modal__icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  margin-inline: 0 var(--se-list-icon-gap, 12px);
  border-radius: 10px;
  background: var(--payment-color, var(--ion-color-medium));
  color: var(--se-surface-card);
  place-items: center;
  font-size: 18px;
}
</style>
