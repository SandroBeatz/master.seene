<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonLabel,
  IonIcon,
  IonToggle,
  IonSpinner,
  IonButton,
  alertController,
  toastController,
} from '@ionic/vue'
import {
  addOutline,
  arrowBackOutline,
  cardOutline,
  cashOutline,
  createOutline,
  informationCircleOutline,
  trashOutline,
  walletOutline,
} from 'ionicons/icons'
import {
  usePaymentTypesQuery,
  useSetPaymentTypeActiveMutation,
  useDeletePaymentTypeMutation,
  ensureSystemPaymentTypes,
  isSystemPaymentType,
  type PaymentType,
  type PaymentTypeKind,
} from '@entities/payment-type'
import { PaymentTypeFormMobile } from '@features/payment-type-form/index.mobile'
import { useSessionStore } from '@entities/session'
import { InsetList } from '@shared/ui/inset-list/index.mobile'

const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: paymentTypes, isPending } = usePaymentTypesQuery(userId)
const setActiveMutation = useSetPaymentTypeActiveMutation(userId)
const deleteMutation = useDeletePaymentTypeMutation(userId)

onMounted(async () => {
  if (userId.value) await ensureSystemPaymentTypes(userId.value)
})

const list = computed(() => paymentTypes.value ?? [])

const KIND_ICON: Record<PaymentTypeKind, string> = {
  cash: cashOutline,
  card: cardOutline,
  custom: walletOutline,
}

function methodName(paymentType: PaymentType): string {
  if (paymentType.kind === 'cash') return t('settings.paymentTypes.system.cash.name')
  if (paymentType.kind === 'card') return t('settings.paymentTypes.system.card.name')
  return paymentType.name
}

function methodSubtitle(paymentType: PaymentType): string {
  if (paymentType.kind === 'cash') return t('settings.paymentTypes.system.cash.subtitle')
  if (paymentType.kind === 'card') return t('settings.paymentTypes.system.card.subtitle')
  return ''
}

async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2000, color, position: 'top' })
  await toast.present()
}

async function onToggle(paymentType: PaymentType, value: boolean) {
  try {
    await setActiveMutation.mutateAsync({ id: paymentType.id, is_active: value })
  } catch {
    await showToast(t('settings.paymentTypes.saveError'), 'danger')
  }
}

const isFormOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<PaymentType | null>(null)

const presentingElement = ref<HTMLElement | null>(null)
onMounted(() => {
  presentingElement.value = document.querySelector('ion-router-outlet')
})

function openCreate() {
  formMode.value = 'create'
  editing.value = null
  isFormOpen.value = true
}

function openEdit(paymentType: PaymentType) {
  if (isSystemPaymentType(paymentType)) return
  formMode.value = 'edit'
  editing.value = paymentType
  isFormOpen.value = true
}

async function deletePaymentType(paymentType: PaymentType): Promise<boolean> {
  try {
    await deleteMutation.mutateAsync(paymentType.id)
    await showToast(t('settings.paymentTypes.deleteSuccess'), 'success')
    return true
  } catch {
    await showToast(t('settings.paymentTypes.deleteError'), 'danger')
    return false
  }
}

async function confirmDelete(paymentType: PaymentType): Promise<boolean> {
  const alert = await alertController.create({
    header: t('settings.paymentTypes.deleteConfirmTitle'),
    message: t('settings.paymentTypes.deleteConfirmBody', { name: methodName(paymentType) }),
    buttons: [
      { text: t('settings.paymentTypes.form.cancel'), role: 'cancel' },
      { text: t('settings.paymentTypes.deleteAction'), role: 'destructive' },
    ],
  })
  await alert.present()
  const result = await alert.onDidDismiss()
  if (result.role !== 'destructive') return false
  return deletePaymentType(paymentType)
}

async function onSwipeDelete(paymentType: PaymentType, event: Event) {
  const sliding = (event.currentTarget as HTMLElement | null)?.closest('ion-item-sliding') as
    | (HTMLElement & { close: () => Promise<void> })
    | null
  await confirmDelete(paymentType)
  await sliding?.close()
}

async function onSwipeEdit(paymentType: PaymentType, event: Event) {
  const sliding = (event.currentTarget as HTMLElement | null)?.closest('ion-item-sliding') as
    | (HTMLElement & { close: () => Promise<void> })
    | null
  await sliding?.close()
  openEdit(paymentType)
}
</script>

<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button
            default-href="/tabs/settings"
            text=""
            :icon="arrowBackOutline"
            color="dark"
          />
        </ion-buttons>
        <ion-title>{{ $t('settings.paymentTypes.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding-vertical">
      <inset-list>
        <ion-item lines="none" class="hint-item">
          <ion-icon
            slot="start"
            :icon="informationCircleOutline"
            color="primary"
            aria-hidden="true"
          />
          <ion-label class="ion-text-wrap hint-text">
            {{ $t('settings.paymentTypes.subtitle') }}
          </ion-label>
        </ion-item>
      </inset-list>

      <div v-if="isPending" class="loading-state" aria-live="polite">
        <ion-spinner name="crescent" />
      </div>

      <inset-list v-else-if="list.length">
        <ion-item-sliding v-for="paymentType in list" :key="paymentType.id">
          <ion-item
            :button="paymentType.kind === 'custom'"
            :detail="paymentType.kind === 'custom'"
            @click="openEdit(paymentType)"
          >
            <span
              slot="start"
              class="method-tile"
              :class="{
                'method-tile--system': paymentType.kind !== 'custom',
                'method-content--inactive': !paymentType.is_active,
              }"
              :style="
                paymentType.kind === 'custom'
                  ? { backgroundColor: `${paymentType.color}1a`, color: paymentType.color }
                  : undefined
              "
            >
              <ion-icon :icon="KIND_ICON[paymentType.kind]" aria-hidden="true" />
            </span>

            <ion-label
              class="method-label"
              :class="{ 'method-content--inactive': !paymentType.is_active }"
            >
              <h2>{{ methodName(paymentType) }}</h2>
              <p v-if="methodSubtitle(paymentType)">{{ methodSubtitle(paymentType) }}</p>
            </ion-label>

            <ion-toggle
              slot="end"
              :checked="paymentType.is_active"
              :disabled="setActiveMutation.isLoading.value"
              :aria-label="`${methodName(paymentType)}: ${$t('settings.paymentTypes.subtitle')}`"
              @click.stop
              @ion-change="onToggle(paymentType, $event.detail.checked)"
            />
          </ion-item>

          <ion-item-options v-if="paymentType.kind === 'custom'" side="end">
            <ion-item-option
              color="medium"
              :aria-label="$t('settings.paymentTypes.form.titleEdit')"
              @click="onSwipeEdit(paymentType, $event)"
            >
              <ion-icon slot="icon-only" :icon="createOutline" />
            </ion-item-option>
            <ion-item-option
              color="danger"
              :aria-label="$t('settings.paymentTypes.deleteAction')"
              @click="onSwipeDelete(paymentType, $event)"
            >
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </inset-list>

      <inset-list v-else>
        <ion-item lines="none" class="empty-item">
          <ion-icon slot="start" :icon="walletOutline" aria-hidden="true" />
          <ion-label class="ion-text-wrap">
            <h2>{{ $t('settings.paymentTypes.emptyTitle') }}</h2>
            <p>{{ $t('settings.paymentTypes.emptyDescription') }}</p>
          </ion-label>
        </ion-item>
      </inset-list>

      <div v-if="!isPending" class="add-action">
        <ion-button expand="block" fill="outline" @click="openCreate">
          <ion-icon slot="start" :icon="addOutline" aria-hidden="true" />
          {{ $t('settings.paymentTypes.addCustomButton') }}
        </ion-button>
      </div>

      <payment-type-form-mobile
        v-model:is-open="isFormOpen"
        :mode="formMode"
        :payment-type="editing"
        :presenting-element="presentingElement"
      />
    </ion-content>
  </ion-page>
</template>

<style scoped>
ion-header ion-toolbar.ios {
  --padding-start: 16px;
  --padding-end: 16px;
}

ion-header ion-toolbar {
  --background: var(--se-surface-page, #f2f2f7);
}

.hint-item {
  --padding-top: 6px;
  --padding-bottom: 6px;
}

.hint-item ion-icon[slot='start'] {
  color: var(--ion-color-primary);
  font-size: 22px;
}

.hint-text {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.8rem;
  line-height: 1.35;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 28px 16px 36px;
}

.method-tile {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-inline-end: 12px;
  border-radius: 12px;
  font-size: 21px;
  transition: opacity 160ms ease;
}

.method-tile--system {
  background: var(--ion-color-step-100, #e8e8ed);
  color: var(--ion-color-medium);
}

.method-label {
  min-width: 0;
  transition: opacity 160ms ease;
}

.method-label h2 {
  overflow: hidden;
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.method-label p {
  overflow: hidden;
  margin-top: 3px;
  color: var(--ion-color-medium);
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.method-content--inactive {
  opacity: 0.45;
}

.empty-item {
  --padding-top: 10px;
  --padding-bottom: 10px;
}

.empty-item ion-icon {
  color: var(--ion-color-medium);
}

.empty-item h2 {
  font-weight: 600;
}

.empty-item p {
  margin-top: 3px;
  color: var(--ion-color-medium);
  font-size: 0.8rem;
  line-height: 1.35;
}

.add-action {
  padding-inline: 16px;
}

.add-action ion-button {
  min-height: 48px;
  margin: 0;
  --border-radius: 12px;
}
</style>
