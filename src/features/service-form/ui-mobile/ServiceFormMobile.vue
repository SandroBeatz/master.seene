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
  IonFooter,
  IonItem,
  IonInput,
  IonTextarea,
  IonToggle,
  IonLabel,
  IonNote,
  IonIcon,
  IonSpinner,
  alertController,
  isPlatform,
  toastController,
} from '@ionic/vue'
import { checkmark, chevronForwardOutline, closeOutline, trashOutline } from 'ionicons/icons'
import {
  useCreateServiceMutation,
  useDeleteServiceMutation,
  useUpdateServiceMutation,
  type CreateServiceDto,
  type Service,
} from '@entities/service'
import { useServiceCategoriesQuery } from '@entities/service-category'
import { ServiceCategoryPickerMobile } from '@features/service-category-form/index.mobile'
import { useSessionStore } from '@entities/session'
import { useFormats } from '@shared/lib/formats'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import { ListPickerModal } from '@shared/ui/list-picker-modal/index.mobile'

const props = defineProps<{
  isOpen: boolean
  mode: 'create' | 'edit'
  service?: Service | null
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [boolean]
  saved: [service: Service]
}>()

const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')
const formats = useFormats()
const isEdit = computed(() => props.mode === 'edit')
const spinnerName = isPlatform('ios') ? 'dots' : 'crescent'

const { data: categories } = useServiceCategoriesQuery(userId)
const createMutation = useCreateServiceMutation(userId)
const updateMutation = useUpdateServiceMutation(userId)
const deleteMutation = useDeleteServiceMutation(userId)

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const
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
  description: string
  duration: number | undefined
  price: string
  categoryId: string | null
  isActive: boolean
  color: string
}

const state = reactive<FormState>({
  name: '',
  description: '',
  duration: undefined,
  price: '',
  categoryId: null,
  isActive: true,
  color: '#a78bfa',
})
const initialState = ref<FormState>({ ...state })
const errors = reactive<Record<string, string>>({})
const submitted = ref(false)
const isSubmitting = ref(false)
const allowDismiss = ref(false)

function currentState(): FormState {
  return {
    name: state.name,
    description: state.description,
    duration: state.duration,
    price: state.price,
    categoryId: state.categoryId,
    isActive: state.isActive,
    color: state.color,
  }
}

function clearErrors() {
  for (const key of Object.keys(errors)) delete errors[key]
}

function resetForm() {
  submitted.value = false
  allowDismiss.value = false
  clearErrors()

  if (isEdit.value && props.service) {
    state.name = props.service.name
    state.description = props.service.description ?? ''
    state.duration = props.service.duration
    state.price = String(props.service.price)
    state.categoryId = props.service.category_id
    state.isActive = props.service.is_active
    state.color = props.service.color
  } else {
    state.name = ''
    state.description = ''
    state.duration = undefined
    state.price = ''
    state.categoryId = null
    state.isActive = true
    state.color = '#a78bfa'
  }

  initialState.value = currentState()
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) resetForm()
  },
)

const isDirty = computed(() => {
  const initial = initialState.value
  return (
    state.name !== initial.name ||
    state.description !== initial.description ||
    state.duration !== initial.duration ||
    state.price !== initial.price ||
    state.categoryId !== initial.categoryId ||
    state.isActive !== initial.isActive ||
    state.color !== initial.color
  )
})

const priceNumber = computed(() => (state.price.trim() === '' ? NaN : Number(state.price)))
const isFormValid = computed(
  () =>
    state.name.trim().length > 0 &&
    state.name.trim().length <= 100 &&
    state.description.length <= 500 &&
    DURATION_OPTIONS.includes(state.duration as (typeof DURATION_OPTIONS)[number]) &&
    Number.isFinite(priceNumber.value) &&
    priceNumber.value >= 0,
)
const isLoading = computed(
  () =>
    isSubmitting.value ||
    createMutation.isLoading.value ||
    updateMutation.isLoading.value ||
    deleteMutation.isLoading.value,
)
const canSubmit = computed(
  () => isFormValid.value && (!isEdit.value || isDirty.value) && !isLoading.value,
)

const schema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().max(500).allow('', null),
  duration: Joi.number()
    .valid(...DURATION_OPTIONS)
    .required(),
  price: Joi.number().min(0).required(),
})

function validate(): boolean {
  clearErrors()
  const { error } = schema.validate(
    {
      name: state.name,
      description: state.description,
      duration: state.duration,
      price: priceNumber.value,
    },
    { abortEarly: false },
  )

  for (const detail of error?.details ?? []) {
    const field = String(detail.path[0])
    if (errors[field]) continue
    if (field === 'name') {
      errors.name =
        detail.type === 'string.max'
          ? t('services.validation.nameMax')
          : t('services.validation.nameRequired')
    } else if (field === 'description') {
      errors.description = t('services.validation.descriptionMax')
    } else if (field === 'duration') {
      errors.duration = t('services.validation.durationRequired')
    } else if (field === 'price') {
      errors.price =
        detail.type === 'number.min'
          ? t('services.validation.priceMin')
          : t('services.validation.priceRequired')
    }
  }
  return Object.keys(errors).length === 0
}

const durationItems = computed(() =>
  DURATION_OPTIONS.map((value) => ({
    value,
    label: formats.duration(value),
  })),
)
const durationLabel = computed(() =>
  state.duration ? formats.duration(state.duration) : t('services.form.durationPlaceholder'),
)
const selectedCategoryName = computed(() => {
  if (!state.categoryId) return t('services.form.allServices')
  return (
    (categories.value ?? []).find((category) => category.id === state.categoryId)?.name ??
    t('services.form.allServices')
  )
})
const currency = computed(() => formats.currency())
const priceStep = computed(() => (currency.value.decimals > 0 ? '0.01' : '1'))

const isDurationPickerOpen = ref(false)
const isCategoryPickerOpen = ref(false)
const selfModal = ref<{ $el: HTMLElement } | null>(null)
const selfModalEl = computed(() => selfModal.value?.$el ?? null)

function onDurationSelect(value: string | number) {
  const duration = Number(value)
  if (DURATION_OPTIONS.includes(duration as (typeof DURATION_OPTIONS)[number])) {
    state.duration = duration
  }
}

function onCategorySelect(id: string | null) {
  state.categoryId = id
}

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
  return (await alert.onDidDismiss()).role === 'destructive'
}

function canDismiss(): boolean | Promise<boolean> {
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
  isDurationPickerOpen.value = false
  isCategoryPickerOpen.value = false
  emit('update:isOpen', false)
}

async function onSubmit() {
  submitted.value = true
  if (!validate() || !canSubmit.value) return
  isSubmitting.value = true

  const dto: CreateServiceDto = {
    name: state.name.trim(),
    description: state.description.trim() || null,
    duration: state.duration!,
    price: priceNumber.value,
    category_id: state.categoryId,
    is_active: state.isActive,
    color: state.color,
    sort_order: props.service?.sort_order ?? 0,
  }

  try {
    const saved =
      isEdit.value && props.service
        ? await updateMutation.mutateAsync({ ...dto, id: props.service.id })
        : await createMutation.mutateAsync(dto)
    await showToast(t('services.form.saveSuccess'), 'success')
    initialState.value = currentState()
    allowDismiss.value = true
    emit('saved', saved)
    emit('update:isOpen', false)
  } catch {
    await showToast(t('services.form.errorTitle'), 'danger')
  } finally {
    isSubmitting.value = false
  }
}

async function onDelete() {
  if (!props.service || isLoading.value) return

  const alert = await alertController.create({
    header: t('services.deleteConfirmTitle'),
    message: t('services.deleteConfirmBody', { name: props.service.name }),
    buttons: [
      { text: t('services.form.cancel'), role: 'cancel' },
      { text: t('services.deleteAction'), role: 'destructive' },
    ],
  })
  await alert.present()
  if ((await alert.onDidDismiss()).role !== 'destructive') return

  try {
    await deleteMutation.mutateAsync(props.service.id)
    await showToast(t('services.deleteSuccess'), 'success')
    allowDismiss.value = true
    emit('update:isOpen', false)
  } catch {
    await showToast(t('services.deleteError'), 'danger')
  }
}
</script>

<template>
  <ion-modal
    ref="selfModal"
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
          {{ isEdit ? $t('services.form.editTitleMobile') : $t('services.form.createTitle') }}
        </ion-title>
        <ion-buttons v-if="isEdit" slot="end">
          <ion-button
            fill="clear"
            color="danger"
            :disabled="isLoading"
            :aria-busy="deleteMutation.isLoading.value"
            :aria-label="$t('services.deleteAction')"
            @click="onDelete"
          >
            <ion-spinner v-if="deleteMutation.isLoading.value" :name="spinnerName" />
            <ion-icon v-else slot="icon-only" :icon="trashOutline" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding-vertical">
      <form id="service-form" @submit.prevent="onSubmit">
        <inset-list>
          <ion-item :class="{ 'ion-invalid': errors.name, 'ion-touched': submitted }">
            <ion-label position="stacked">{{ $t('services.form.name') }}</ion-label>
            <ion-input
              v-model="state.name"
              :placeholder="$t('services.form.namePlaceholder')"
              :maxlength="100"
              autocapitalize="sentences"
              enterkeyhint="next"
            />
          </ion-item>
          <ion-item
            lines="none"
            class="description-item"
            :class="{ 'ion-invalid': errors.description, 'ion-touched': submitted }"
          >
            <ion-label position="stacked">{{ $t('services.form.description') }}</ion-label>
            <ion-textarea
              v-model="state.description"
              :placeholder="$t('services.form.descriptionPlaceholder')"
              :auto-grow="true"
              :rows="3"
              :maxlength="500"
              :counter="true"
            />
          </ion-item>
        </inset-list>
        <ion-note v-if="errors.name" color="danger" class="field-error">{{ errors.name }}</ion-note>
        <ion-note v-if="errors.description" color="danger" class="field-error">
          {{ errors.description }}
        </ion-note>

        <inset-list>
          <ion-item
            button
            :detail="false"
            :class="{ 'ion-invalid': errors.duration, 'ion-touched': submitted }"
            @click="isDurationPickerOpen = true"
          >
            <ion-label>{{ $t('services.form.duration') }}</ion-label>
            <div
              slot="end"
              class="select-value"
              :class="{ 'select-value--empty': !state.duration }"
            >
              <span>{{ durationLabel }}</span>
              <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
            </div>
          </ion-item>
          <ion-item lines="none" :class="{ 'ion-invalid': errors.price, 'ion-touched': submitted }">
            <ion-label position="stacked">{{ $t('services.form.price') }}</ion-label>
            <ion-input
              v-model="state.price"
              type="number"
              inputmode="decimal"
              min="0"
              :step="priceStep"
              :placeholder="$t('services.form.pricePlaceholder')"
            >
              <span v-if="currency.position === 'prefix'" slot="start" class="currency-symbol">
                {{ currency.symbol }}
              </span>
              <span v-else slot="end" class="currency-symbol">{{ currency.symbol }}</span>
            </ion-input>
          </ion-item>
        </inset-list>
        <ion-note v-if="errors.duration" color="danger" class="field-error">
          {{ errors.duration }}
        </ion-note>
        <ion-note v-if="errors.price" color="danger" class="field-error">{{
          errors.price
        }}</ion-note>

        <inset-list>
          <ion-item button :detail="false" lines="none" @click="isCategoryPickerOpen = true">
            <ion-label>{{ $t('services.form.category') }}</ion-label>
            <div slot="end" class="select-value">
              <span>{{ selectedCategoryName }}</span>
              <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
            </div>
          </ion-item>
        </inset-list>

        <inset-list :header="$t('services.form.color')">
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

        <inset-list>
          <ion-item lines="none" class="active-item">
            <ion-label class="ion-text-wrap">
              <h2>{{ $t('services.form.isActive') }}</h2>
              <p>{{ $t('services.form.isActiveDescription') }}</p>
            </ion-label>
            <ion-toggle
              v-model="state.isActive"
              slot="end"
              :aria-label="$t('services.form.isActive')"
            />
          </ion-item>
        </inset-list>

        <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true" />
      </form>

      <list-picker-modal
        v-model:is-open="isDurationPickerOpen"
        :title="$t('services.form.duration')"
        :items="durationItems"
        :model-value="state.duration ?? 0"
        :presenting-element="selfModalEl"
        @update:model-value="onDurationSelect"
      />

      <service-category-picker-mobile
        v-model:is-open="isCategoryPickerOpen"
        :selected-id="state.categoryId"
        :presenting-element="selfModalEl"
        @select="onCategorySelect"
      />
    </ion-content>

    <ion-footer class="ion-no-border">
      <ion-toolbar>
        <ion-button
          class="save-button"
          expand="block"
          :disabled="!canSubmit"
          :aria-busy="isLoading"
          @click="onSubmit"
        >
          <span :class="{ 'save-button-label--hidden': isLoading }">
            {{ isEdit ? $t('services.form.save') : $t('services.addService') }}
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

form ion-item {
  --padding-top: 8px;
  --padding-bottom: 8px;
}

form ion-label[position='stacked'] {
  margin-bottom: 6px;
  color: var(--ion-color-medium);
  font-size: 0.78rem;
}

.description-item {
  --padding-bottom: 4px;
}

.field-error {
  display: block;
  margin-top: -17px;
  margin-bottom: 21px;
  padding-inline: 32px;
  font-size: 0.75rem;
}

.select-value {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 4px;
  color: var(--ion-text-color);
  font-size: 0.92rem;
}

.select-value span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-value ion-icon {
  flex: 0 0 auto;
  color: var(--ion-color-medium);
  font-size: 18px;
}

.select-value--empty {
  color: var(--ion-color-medium);
}

.currency-symbol {
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}

.palette-item {
  --padding-top: 14px;
  --padding-bottom: 14px;
}

.color-palette {
  display: grid;
  width: 100%;
  padding-block: 3px;
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

.active-item {
  --padding-top: 7px;
  --padding-bottom: 7px;
}

.active-item h2 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
}

.active-item p {
  margin-top: 3px;
  color: var(--ion-color-medium);
  font-size: 0.78rem;
  line-height: 1.35;
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
