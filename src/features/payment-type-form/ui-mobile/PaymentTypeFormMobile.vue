<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Joi from 'joi'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonInput,
  IonLabel,
  IonIcon,
  IonSpinner,
  toastController,
} from '@ionic/vue'
import { cashOutline } from 'ionicons/icons'
import {
  useCreatePaymentTypeMutation,
  useUpdatePaymentTypeMutation,
  type CreatePaymentTypeDto,
  type PaymentType,
} from '@entities/payment-type'
import { useSessionStore } from '@entities/session'

const props = defineProps<{
  isOpen: boolean
  mode: 'create' | 'edit'
  paymentType?: PaymentType | null
  // Parent element (router outlet / parent modal) — lets this present as an iOS
  // card (page scaled behind the sheet). See Ionic "card modal" docs.
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [boolean]
  saved: [paymentType: PaymentType]
  // Deletion is owned by the parent (confirm dialog + mutation live on the
  // list); the form just closes and hands the method back.
  delete: [paymentType: PaymentType]
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

const errors = reactive<Record<string, string>>({})
const submitted = ref(false)

function resetForm() {
  submitted.value = false
  for (const key of Object.keys(errors)) delete errors[key]
  if (isEdit.value && props.paymentType) {
    state.name = props.paymentType.name
    state.color = props.paymentType.color
  } else {
    state.name = ''
    state.color = COLOR_PALETTE[0]!
  }
}

// Re-seed every time the sheet opens so a reused component instance never shows
// a previous method's data.
watch(
  () => props.isOpen,
  (open) => {
    if (open) resetForm()
  },
)

const schema = Joi.object({
  name: Joi.string().trim().min(1).max(50).required(),
  color: Joi.string().required(),
})

function validate(): boolean {
  for (const key of Object.keys(errors)) delete errors[key]
  const { error } = schema.validate(
    { name: state.name, color: state.color },
    { abortEarly: false },
  )
  if (error) {
    for (const detail of error.details) {
      const field = String(detail.path[0])
      if (errors[field]) continue
      if (field === 'name') {
        errors.name =
          detail.type === 'string.max'
            ? t('common.validation.tooLong')
            : t('common.validation.required')
      }
    }
  }
  return Object.keys(errors).length === 0
}

const createMutation = useCreatePaymentTypeMutation(userId)
const updateMutation = useUpdatePaymentTypeMutation(userId)
const isLoading = computed(
  () => createMutation.isLoading.value || updateMutation.isLoading.value,
)

async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2000, color, position: 'top' })
  await toast.present()
}

function close() {
  emit('update:isOpen', false)
}

async function onSubmit() {
  submitted.value = true
  if (!validate()) return

  const dto: CreatePaymentTypeDto = {
    name: state.name.trim(),
    color: state.color,
    kind: 'custom',
    is_default: false,
    is_active: props.paymentType?.is_active ?? true,
    sort_order: props.paymentType?.sort_order ?? 0,
  }

  try {
    let saved: PaymentType
    if (isEdit.value && props.paymentType) {
      saved = await updateMutation.mutateAsync({ ...dto, id: props.paymentType.id })
      await showToast(t('settings.paymentTypes.updateSuccess'), 'success')
    } else {
      saved = await createMutation.mutateAsync(dto)
      await showToast(t('settings.paymentTypes.createSuccess'), 'success')
    }
    emit('saved', saved)
    close()
  } catch {
    await showToast(t('settings.paymentTypes.saveError'), 'danger')
  }
}

function onDelete() {
  if (!props.paymentType) return
  const pt = props.paymentType
  close()
  emit('delete', pt)
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    :presenting-element="presentingElement ?? undefined"
    @did-dismiss="close"
  >
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button :disabled="isLoading" @click="close">
            {{ $t('settings.paymentTypes.form.cancel') }}
          </ion-button>
        </ion-buttons>
        <ion-title>
          {{
            isEdit
              ? $t('settings.paymentTypes.form.titleEdit')
              : $t('settings.paymentTypes.form.titleCreate')
          }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button strong :disabled="isLoading" @click="onSubmit">
            <ion-spinner v-if="isLoading" name="crescent" />
            <span v-else>
              {{
                isEdit
                  ? $t('settings.paymentTypes.form.submitEdit')
                  : $t('settings.paymentTypes.form.submitCreate')
              }}
            </span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding-vertical">
      <form @submit.prevent="onSubmit">
        <ion-list inset>
          <ion-item>
            <div slot="start" class="pt-preview" :style="{ backgroundColor: `${state.color}1a` }">
              <ion-icon :icon="cashOutline" :style="{ color: state.color }" aria-hidden="true" />
            </div>
            <ion-input
              v-model="state.name"
              label-placement="stacked"
              :label="$t('settings.paymentTypes.form.name')"
              :placeholder="$t('settings.paymentTypes.form.namePlaceholder')"
              :class="{ 'ion-invalid': errors.name, 'ion-touched': submitted }"
              :error-text="errors.name"
              autocapitalize="sentences"
              enterkeyhint="done"
            />
          </ion-item>
        </ion-list>

        <ion-list inset>
          <ion-list-header>
            <ion-label>{{ $t('settings.paymentTypes.form.color') }}</ion-label>
          </ion-list-header>
          <ion-item lines="none">
            <div class="color-palette">
              <button
                v-for="c in COLOR_PALETTE"
                :key="c"
                type="button"
                class="color-swatch"
                :style="{
                  backgroundColor: c,
                  boxShadow: state.color === c ? `0 0 0 2px var(--ion-background-color), 0 0 0 4px ${c}` : 'none',
                }"
                :aria-label="c"
                @click="state.color = c"
              />
            </div>
          </ion-item>
        </ion-list>

        <ion-list v-if="isEdit" inset>
          <ion-item button lines="none" :disabled="isLoading" @click="onDelete">
            <ion-label color="danger">{{ $t('settings.paymentTypes.deleteAction') }}</ion-label>
          </ion-item>
        </ion-list>

        <!-- Lets the keyboard "done" action submit the form. -->
        <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true" />
      </form>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.pt-preview {
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

.color-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-block: 8px;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 9999px;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.color-swatch:active {
  transform: scale(1.1);
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
