<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { closeOutline } from 'ionicons/icons'
import { useFormats } from '@shared/lib/formats'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import type { Sale, UpdateSaleDetailsDto } from '../model/types'

interface DraftItem {
  id: string
  name: string
  price: number
}

const props = defineProps<{
  isOpen: boolean
  sale: Sale
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  save: [details: UpdateSaleDetailsDto]
}>()

const { t } = useI18n()
const formats = useFormats()
const decimals = computed(() => formats.currency().decimals)
const draftItems = ref<DraftItem[]>([])
const draftTotal = ref(0)
const hasItemInputs = computed(() => draftItems.value.length > 1)
const canSave = computed(
  () =>
    Number.isFinite(draftTotal.value) &&
    draftTotal.value >= 0 &&
    draftItems.value.every((item) => Number.isFinite(item.price) && item.price >= 0),
)

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return
    draftItems.value = (props.sale.items ?? []).map((item) => ({
      id: item.id,
      name: item.name_snapshot,
      price: item.price_snapshot,
    }))
    draftTotal.value = props.sale.amount
  },
  { immediate: true },
)

function round(value: number): number {
  const factor = 10 ** decimals.value
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function readNumber(event: CustomEvent<{ value?: string | null }>): number {
  const value = Number(event.detail.value)
  return Number.isFinite(value) ? Math.max(0, round(value)) : 0
}

function setItemAmount(index: number, event: CustomEvent<{ value?: string | null }>) {
  const item = draftItems.value[index]
  if (!item) return
  item.price = readNumber(event)
  draftTotal.value = round(draftItems.value.reduce((sum, entry) => sum + entry.price, 0))
}

function distributeTotal(total: number) {
  const items = draftItems.value
  if (!items.length) return
  if (items.length === 1) {
    items[0]!.price = total
    return
  }

  const current = items.reduce((sum, item) => sum + item.price, 0)
  const next =
    current <= 0
      ? items.map(() => round(total / items.length))
      : items.map((item) => round((total * item.price) / current))
  const distributed = next.reduce((sum, amount) => sum + amount, 0)
  next[next.length - 1] = round(next[next.length - 1]! + (total - distributed))
  draftItems.value = items.map((item, index) => ({ ...item, price: next[index]! }))
}

function setTotal(event: CustomEvent<{ value?: string | null }>) {
  const total = readNumber(event)
  draftTotal.value = total
  distributeTotal(total)
}

function close() {
  emit('update:isOpen', false)
}

function save() {
  if (!canSave.value) return
  emit('save', {
    amount: draftTotal.value,
    items: draftItems.value.map((item) => ({ id: item.id, price: item.price })),
  })
  close()
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    class="sale-amount-editor-modal"
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
        <ion-title>{{ t('checkout.editPaidAmount') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="sale-amount-editor-modal__content ion-padding-vertical">
      <inset-list :header="t('checkout.services')">
        <ion-item v-for="(item, index) in draftItems" :key="item.id">
          <ion-label class="ion-text-wrap">{{ item.name }}</ion-label>
          <ion-input
            v-if="hasItemInputs"
            slot="end"
            class="sale-amount-editor-modal__amount"
            type="number"
            inputmode="decimal"
            min="0"
            :value="item.price"
            :data-testid="`sale-item-amount-${item.id}`"
            :aria-label="`${item.name}: ${t('appointments.preview.price')}`"
            @ion-input="setItemAmount(index, $event)"
          />
        </ion-item>

        <ion-item class="sale-amount-editor-modal__total" lines="none">
          <ion-label>
            <strong>{{ t('checkout.total') }}</strong>
          </ion-label>
          <ion-input
            slot="end"
            class="sale-amount-editor-modal__amount"
            type="number"
            inputmode="decimal"
            min="0"
            :value="draftTotal"
            data-testid="sale-total-amount"
            :aria-label="t('checkout.total')"
            @ion-input="setTotal"
          />
        </ion-item>
      </inset-list>
    </ion-content>

    <ion-footer class="sale-amount-editor-modal__footer ion-no-border">
      <ion-toolbar>
        <div class="sale-amount-editor-modal__footer-row">
          <ion-button expand="block" :disabled="!canSave" @click="save">
            {{ t('appointments.preview.save') }}
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<style scoped>
.sale-amount-editor-modal ion-toolbar,
.sale-amount-editor-modal__content {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.sale-amount-editor-modal__amount {
  width: 112px;
  max-width: 112px;
  text-align: end;
}

.sale-amount-editor-modal__total {
  font-size: 1rem;
}

.sale-amount-editor-modal__footer-row {
  padding: 8px 16px calc(8px + var(--safe-area-bottom, 0px));
}

.sale-amount-editor-modal__footer-row ion-button {
  margin: 0;
  text-transform: none;
}
</style>
