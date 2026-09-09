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
  IonList,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonLabel,
  IonIcon,
  IonToggle,
  IonSpinner,
  IonFab,
  IonFabButton,
  alertController,
  toastController,
} from '@ionic/vue'
import { add, cash, card, cashOutline, createOutline, trash } from 'ionicons/icons'
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

const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

// The same Colada query the desktop payment methods page uses — shared cache,
// shared Supabase call. Nothing about data fetching is duplicated for mobile.
const { data: paymentTypes, isPending } = usePaymentTypesQuery(userId)
const setActiveMutation = useSetPaymentTypeActiveMutation(userId)
const deleteMutation = useDeletePaymentTypeMutation(userId)

// System methods (cash/card) must exist before the list is meaningful.
onMounted(async () => {
  if (userId.value) await ensureSystemPaymentTypes(userId.value)
})

// Server already returns methods in their sort order.
const list = computed(() => paymentTypes.value ?? [])

// --- Display helpers -------------------------------------------------------
const KIND_ICON: Record<PaymentTypeKind, string> = {
  cash,
  card,
  custom: cashOutline,
}

function methodName(pt: PaymentType): string {
  if (pt.kind === 'cash') return t('settings.paymentTypes.system.cash.name')
  if (pt.kind === 'card') return t('settings.paymentTypes.system.card.name')
  return pt.name
}

function methodSubtitle(pt: PaymentType): string {
  if (pt.kind === 'cash') return t('settings.paymentTypes.system.cash.subtitle')
  if (pt.kind === 'card') return t('settings.paymentTypes.system.card.subtitle')
  return ''
}

async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2000, color, position: 'top' })
  await toast.present()
}

async function onToggle(pt: PaymentType, value: boolean) {
  try {
    await setActiveMutation.mutateAsync({ id: pt.id, is_active: value })
  } catch {
    await showToast(t('settings.paymentTypes.saveError'), 'danger')
  }
}

// --- Create / edit ---------------------------------------------------------
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

function openEdit(pt: PaymentType) {
  if (isSystemPaymentType(pt)) return
  formMode.value = 'edit'
  editing.value = pt
  isFormOpen.value = true
}

// --- Delete (custom only) --------------------------------------------------
async function deletePaymentType(pt: PaymentType) {
  try {
    await deleteMutation.mutateAsync(pt.id)
    await showToast(t('settings.paymentTypes.deleteSuccess'), 'success')
  } catch {
    await showToast(t('settings.paymentTypes.deleteError'), 'danger')
  }
}

async function confirmDelete(pt: PaymentType) {
  const alert = await alertController.create({
    header: t('settings.paymentTypes.deleteConfirmTitle'),
    message: t('settings.paymentTypes.deleteConfirmBody', { name: methodName(pt) }),
    buttons: [
      { text: t('settings.paymentTypes.form.cancel'), role: 'cancel' },
      {
        text: t('settings.paymentTypes.deleteAction'),
        role: 'destructive',
        handler: () => {
          void deletePaymentType(pt)
        },
      },
    ],
  })
  await alert.present()
  await alert.onDidDismiss()
}

async function onSwipeDelete(pt: PaymentType, ev: Event) {
  const sliding = (ev.currentTarget as HTMLElement | null)?.closest('ion-item-sliding') as
    | (HTMLElement & { close: () => Promise<void> })
    | null
  await confirmDelete(pt)
  await sliding?.close()
}

async function onSwipeEdit(pt: PaymentType, ev: Event) {
  const sliding = (ev.currentTarget as HTMLElement | null)?.closest('ion-item-sliding') as
    | (HTMLElement & { close: () => Promise<void> })
    | null
  await sliding?.close()
  openEdit(pt)
}
</script>

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/settings" />
        </ion-buttons>
        <ion-title>{{ $t('settings.paymentTypes.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{ $t('settings.paymentTypes.title') }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <div v-if="isPending" class="flex justify-center py-10">
        <ion-spinner />
      </div>

      <ion-list v-else inset>
        <ion-item-sliding v-for="pt in list" :key="pt.id">
          <ion-item
            :button="pt.kind === 'custom'"
            :detail="pt.kind === 'custom'"
            :class="{ 'se-inactive': !pt.is_active }"
            @click="openEdit(pt)"
          >
            <span
              slot="start"
              class="se-method-tile"
              :style="
                pt.kind === 'custom'
                  ? { backgroundColor: `${pt.color}1a`, color: pt.color }
                  : undefined
              "
              :class="{ 'se-method-tile--system': pt.kind !== 'custom' }"
            >
              <ion-icon :icon="KIND_ICON[pt.kind]" aria-hidden="true" />
            </span>
            <ion-label>
              <h2>{{ methodName(pt) }}</h2>
              <p v-if="methodSubtitle(pt)">{{ methodSubtitle(pt) }}</p>
            </ion-label>
            <ion-toggle
              slot="end"
              :checked="pt.is_active"
              :aria-label="$t('settings.paymentTypes.subtitle')"
              @click.stop
              @ion-change="onToggle(pt, $event.detail.checked)"
            />
          </ion-item>
          <ion-item-options v-if="pt.kind === 'custom'" side="end">
            <ion-item-option
              color="medium"
              :aria-label="$t('settings.paymentTypes.form.titleEdit')"
              @click="onSwipeEdit(pt, $event)"
            >
              <ion-icon slot="icon-only" :icon="createOutline" />
            </ion-item-option>
            <ion-item-option
              color="danger"
              :aria-label="$t('settings.paymentTypes.deleteAction')"
              @click="onSwipeDelete(pt, $event)"
            >
              <ion-icon slot="icon-only" :icon="trash" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <!-- Primary add action, bottom-right per Material/iOS FAB pattern. -->
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button :aria-label="$t('settings.paymentTypes.addCustomButton')" @click="openCreate">
          <ion-icon :icon="add" />
        </ion-fab-button>
      </ion-fab>

      <payment-type-form-mobile
        v-model:is-open="isFormOpen"
        :mode="formMode"
        :payment-type="editing"
        :presenting-element="presentingElement"
        @delete="confirmDelete"
      />
    </ion-content>
  </ion-page>
</template>

<style scoped>
.se-method-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  margin-inline-end: 12px;
  font-size: 20px;
  flex-shrink: 0;
}

.se-method-tile--system {
  background-color: var(--ion-color-step-100, #f2f2f2);
  color: var(--ion-color-medium);
}

.se-inactive {
  opacity: 0.55;
}
</style>
