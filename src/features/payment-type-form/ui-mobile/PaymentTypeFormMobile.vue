<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonFooter,
  IonItem,
  IonInput,
  IonLabel,
  IonNote,
  IonIcon,
  IonSpinner,
  alertController,
  isPlatform,
  toastController,
} from '@ionic/vue'
import { checkmark, closeOutline, trashOutline, walletOutline } from 'ionicons/icons'
import {
  useCreatePaymentTypeMutation,
  useDeletePaymentTypeMutation,
  useUpdatePaymentTypeMutation,
  type CreatePaymentTypeDto,
  type PaymentType,
} from '@entities/payment-type'
import { useSessionStore } from '@entities/session'
import { InsetList } from '@shared/ui/inset-list/index.mobile'

const props = defineProps<{
  isOpen: boolean
  mode: 'create' | 'edit'
  paymentType?: PaymentType | null
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [boolean]
  saved: [paymentType: PaymentType]
}>()

const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')
const isEdit = computed(() => props.mode === 'edit')

const COLOR_PALETTE = [
  '#f87171',
  '#fb923c',
  '#facc15',
  '#4ade80',
  '#34d399',
  '#60a5fa',
  '#818cf8',
  '#a78bfa',
  '#f472b6',
  '#94a3b8',
]

interface FormState {
  name: string
  color: string
}

const state = reactive<FormState>({
  name: '',
  color: COLOR_PALETTE[0]!,
})
const initialState = ref<FormState>({ ...state })
const submitted = ref(false)
const allowDismiss = ref(false)
const isSubmitting = ref(false)

function currentState(): FormState {
  return { name: state.name, color: state.color }
}

function resetForm() {
  submitted.value = false
  allowDismiss.value = false

  if (isEdit.value && props.paymentType) {
    state.name = props.paymentType.name
    state.color = props.paymentType.color
  } else {
    state.name = ''
    state.color = COLOR_PALETTE[0]!
  }

  initialState.value = currentState()
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) resetForm()
  },
)

const trimmedName = computed(() => state.name.trim())
const isFormValid = computed(() => trimmedName.value.length > 0 && trimmedName.value.length <= 50)
const isDirty = computed(
  () => state.name !== initialState.value.name || state.color !== initialState.value.color,
)
const nameError = computed(() => {
  if (!submitted.value) return undefined
  if (!trimmedName.value) return t('common.validation.required')
  if (trimmedName.value.length > 50) return t('common.validation.tooLong')
  return undefined
})

const createMutation = useCreatePaymentTypeMutation(userId)
const updateMutation = useUpdatePaymentTypeMutation(userId)
const deleteMutation = useDeletePaymentTypeMutation(userId)
const isLoading = computed(() => isSubmitting.value || deleteMutation.isLoading.value)
const canSubmit = computed(
  () => isFormValid.value && (!isEdit.value || isDirty.value) && !isLoading.value,
)
const spinnerName = isPlatform('ios') ? 'dots' : 'crescent'

async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2000, color, position: 'top' })
  await toast.present()
}

async function confirmDiscard(): Promise<boolean> {
  const alert = await alertController.create({
    header: t('common.unsavedChanges'),
    message: t('common.unsavedChangesConfirm'),
    buttons: [
      { text: t('common.cancel'), role: 'cancel' },
      { text: t('common.discard'), role: 'destructive' },
    ],
  })
  await alert.present()
  const result = await alert.onDidDismiss()
  return result.role === 'destructive'
}

async function canDismiss(): Promise<boolean> {
  if (isLoading.value) return false
  if (allowDismiss.value || !isDirty.value) return true
  return confirmDiscard()
}

async function close() {
  if (isLoading.value) return
  if (!allowDismiss.value && isDirty.value && !(await confirmDiscard())) return
  allowDismiss.value = true
  emit('update:isOpen', false)
}

function onDidDismiss() {
  allowDismiss.value = false
  emit('update:isOpen', false)
}

async function onSubmit() {
  submitted.value = true
  if (!canSubmit.value) return
  isSubmitting.value = true

  const dto: CreatePaymentTypeDto = {
    name: trimmedName.value,
    color: state.color,
    kind: 'custom',
    is_default: false,
    is_active: props.paymentType?.is_active ?? true,
    sort_order: props.paymentType?.sort_order ?? 0,
  }

  try {
    const saved =
      isEdit.value && props.paymentType
        ? await updateMutation.mutateAsync({ ...dto, id: props.paymentType.id })
        : await createMutation.mutateAsync(dto)
    await showToast(
      isEdit.value
        ? t('settings.paymentTypes.updateSuccess')
        : t('settings.paymentTypes.createSuccess'),
      'success',
    )
    initialState.value = currentState()
    allowDismiss.value = true
    emit('saved', saved)
    emit('update:isOpen', false)
  } catch {
    await showToast(t('settings.paymentTypes.saveError'), 'danger')
  } finally {
    isSubmitting.value = false
  }
}

async function onDelete() {
  if (!props.paymentType || isLoading.value) return

  const alert = await alertController.create({
    header: t('settings.paymentTypes.deleteConfirmTitle'),
    message: t('settings.paymentTypes.deleteConfirmBody', { name: props.paymentType.name }),
    buttons: [
      { text: t('settings.paymentTypes.form.cancel'), role: 'cancel' },
      { text: t('settings.paymentTypes.deleteAction'), role: 'destructive' },
    ],
  })
  await alert.present()
  const result = await alert.onDidDismiss()
  if (result.role !== 'destructive') return

  try {
    await deleteMutation.mutateAsync(props.paymentType.id)
    await showToast(t('settings.paymentTypes.deleteSuccess'), 'success')
    allowDismiss.value = true
    emit('update:isOpen', false)
  } catch {
    await showToast(t('settings.paymentTypes.deleteError'), 'danger')
  }
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
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
            :disabled="isLoading"
            :aria-label="$t('common.close')"
            @click="close"
          >
            <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
          </ion-button>
        </ion-buttons>

        <ion-title>
          {{
            isEdit
              ? $t('settings.paymentTypes.form.titleEdit')
              : $t('settings.paymentTypes.form.titleCreate')
          }}
        </ion-title>

        <ion-buttons v-if="isEdit" slot="end">
          <ion-button
            color="danger"
            :disabled="isLoading"
            :aria-busy="deleteMutation.isLoading.value"
            @click="onDelete"
          >
            <ion-spinner v-if="deleteMutation.isLoading.value" :name="spinnerName" />
            <template v-else>
              <ion-icon slot="start" :icon="trashOutline" aria-hidden="true" />
              {{ $t('settings.paymentTypes.deleteAction') }}
            </template>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding-vertical">
      <form id="payment-type-form" @submit.prevent="onSubmit">
        <inset-list>
          <ion-item :class="{ 'ion-invalid': nameError, 'ion-touched': submitted }" lines="none">
            <span
              slot="start"
              class="method-preview"
              :style="{ backgroundColor: `${state.color}1a`, color: state.color }"
            >
              <ion-icon :icon="walletOutline" aria-hidden="true" />
            </span>
            <ion-label class="field-label">{{ $t('settings.paymentTypes.form.name') }}</ion-label>
            <ion-input
              v-model="state.name"
              class="value-input"
              :placeholder="$t('settings.paymentTypes.form.namePlaceholder')"
              :maxlength="50"
              autocapitalize="sentences"
              enterkeyhint="done"
            />
          </ion-item>
        </inset-list>
        <ion-note v-if="nameError" color="danger" class="field-hint">{{ nameError }}</ion-note>

        <inset-list :header="$t('settings.paymentTypes.form.color')">
          <ion-item lines="none" class="palette-item">
            <div class="color-palette" role="radiogroup">
              <button
                v-for="color in COLOR_PALETTE"
                :key="color"
                type="button"
                class="color-swatch"
                :class="{ 'color-swatch--selected': state.color === color }"
                :style="{ '--swatch-color': color }"
                role="radio"
                :aria-checked="state.color === color"
                :aria-label="color"
                @click="state.color = color"
              >
                <ion-icon v-if="state.color === color" :icon="checkmark" aria-hidden="true" />
              </button>
            </div>
          </ion-item>
        </inset-list>

        <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true" />
      </form>
    </ion-content>

    <ion-footer class="ion-no-border">
      <ion-toolbar>
        <ion-button
          class="save-button"
          expand="block"
          type="button"
          :disabled="!canSubmit"
          :aria-busy="isLoading"
          @click="onSubmit"
        >
          <span :class="{ 'save-button-label--hidden': isLoading }">
            {{
              isEdit
                ? $t('settings.paymentTypes.form.submitEdit')
                : $t('settings.paymentTypes.form.submitCreate')
            }}
          </span>
          <ion-spinner v-if="isLoading" class="save-button-spinner" :name="spinnerName" />
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-modal>
</template>

<style scoped>
ion-header ion-toolbar.ios {
  --padding-start: 16px;
  --padding-end: 16px;
}

ion-header ion-toolbar {
  --background: var(--se-surface-page, #f2f2f7);
}

.method-preview {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-inline-end: 12px;
  border-radius: 12px;
  font-size: 20px;
}

.field-label {
  flex: 0 0 auto;
  margin-inline-end: 12px;
  color: var(--ion-color-medium);
  font-size: 0.95rem;
  white-space: nowrap;
}

.value-input {
  flex: 1 1 auto;
  text-align: end;
  --color: var(--ion-text-color);
  --padding-end: 0;
  --placeholder-color: var(--ion-color-medium);
  --placeholder-opacity: 1;
}

.field-hint {
  display: block;
  margin-top: -14px;
  margin-bottom: 22px;
  padding-inline: 32px;
  font-size: 0.75rem;
}

.palette-item {
  --padding-top: 12px;
  --padding-bottom: 12px;
}

.color-palette {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(5, minmax(40px, 1fr));
  gap: 14px 10px;
}

.color-swatch {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  padding: 0;
  border: 3px solid transparent;
  border-radius: 50%;
  background: var(--swatch-color);
  color: #fff;
  cursor: pointer;
  justify-self: center;
  outline: 2px solid transparent;
  outline-offset: 2px;
  transition:
    transform 120ms ease,
    outline-color 120ms ease;
}

.color-swatch--selected {
  outline-color: var(--swatch-color);
  transform: scale(0.9);
}

.color-swatch:active {
  transform: scale(0.84);
}

.color-swatch ion-icon {
  font-size: 22px;
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 25%));
}

ion-footer ion-toolbar {
  --padding-top: 16px;
  --padding-bottom: 16px;
  --padding-start: 16px;
  --padding-end: 16px;
}

.save-button {
  position: relative;
  min-height: 48px;
  margin: 0;
  --border-radius: 12px;
}

.save-button-label--hidden {
  opacity: 0;
}

.save-button-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
