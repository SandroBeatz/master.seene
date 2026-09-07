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
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonLabel,
  IonNote,
  IonIcon,
  IonSpinner,
  toastController,
} from '@ionic/vue'
import { chevronForward } from 'ionicons/icons'
import {
  useCreateServiceMutation,
  useUpdateServiceMutation,
  type CreateServiceDto,
  type Service,
} from '@entities/service'
import { useServiceCategoriesQuery } from '@entities/service-category'
import { ServiceCategoryPickerMobile } from '@features/service-category-form/index.mobile'
import { useSessionStore } from '@entities/session'

const props = defineProps<{
  isOpen: boolean
  mode: 'create' | 'edit'
  service?: Service | null
  // The list page passes its router outlet so the modal renders as an iOS card
  // (page scaled behind the sheet). Optional — plain sheet otherwise.
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [boolean]
  saved: [service: Service]
  // Deletion is owned by the parent (confirm dialog + mutation live on the
  // list); the form just closes and hands the service back.
  delete: [service: Service]
}>()

const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const isEdit = computed(() => props.mode === 'edit')

const { data: categories } = useServiceCategoriesQuery(userId)

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120]

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
  // Kept as a string for the native number input; parsed on validate/submit.
  price: string
  category_id: string | null
  is_active: boolean
  color: string
}

const state = reactive<FormState>({
  name: '',
  description: '',
  duration: undefined,
  price: '',
  category_id: null,
  is_active: true,
  color: '#a78bfa',
})

const errors = reactive<Record<string, string>>({})
const submitted = ref(false)

function resetForm() {
  submitted.value = false
  for (const key of Object.keys(errors)) delete errors[key]
  if (isEdit.value && props.service) {
    state.name = props.service.name
    state.description = props.service.description ?? ''
    state.duration = props.service.duration
    state.price = String(props.service.price)
    state.category_id = props.service.category_id
    state.is_active = props.service.is_active
    state.color = props.service.color
  } else {
    state.name = ''
    state.description = ''
    state.duration = undefined
    state.price = ''
    state.category_id = null
    state.is_active = true
    state.color = '#a78bfa'
  }
}

// Re-seed every time the sheet opens so a reused component instance never shows
// a previous service's data.
watch(
  () => props.isOpen,
  (open) => {
    if (open) resetForm()
  },
)

const schema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().max(500).allow('', null),
  duration: Joi.number().valid(...DURATION_OPTIONS).required(),
  price: Joi.number().min(0).required(),
})

function validate(): boolean {
  for (const key of Object.keys(errors)) delete errors[key]
  const priceNum = state.price === '' ? NaN : Number(state.price)
  const { error } = schema.validate(
    {
      name: state.name,
      description: state.description,
      duration: state.duration,
      price: priceNum,
    },
    { abortEarly: false },
  )
  if (error) {
    for (const detail of error.details) {
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
  }
  return Object.keys(errors).length === 0
}

const createMutation = useCreateServiceMutation(userId)
const updateMutation = useUpdateServiceMutation(userId)
const isLoading = computed(
  () => createMutation.isLoading.value || updateMutation.isLoading.value,
)

// Category is chosen (and managed — create/edit/delete) through a dedicated
// picker modal rather than an inline select.
const isCategoryPickerOpen = ref(false)
const selectedCategoryName = computed(() => {
  if (!state.category_id) return t('services.form.allServices')
  return (
    (categories.value ?? []).find((c) => c.id === state.category_id)?.name ??
    t('services.form.allServices')
  )
})

function onCategorySelect(id: string | null) {
  state.category_id = id
}

// Presenting the picker off this modal's own element makes it stack as an iOS
// card on top of the service form (see Ionic "card modal" docs).
const selfModal = ref<{ $el: HTMLElement } | null>(null)
const selfModalEl = computed(() => selfModal.value?.$el ?? null)

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

  const dto: CreateServiceDto = {
    name: state.name.trim(),
    description: state.description.trim() || null,
    duration: state.duration!,
    price: Number(state.price),
    category_id: state.category_id,
    is_active: state.is_active,
    color: state.color,
    sort_order: props.service?.sort_order ?? 0,
  }

  try {
    const saved =
      isEdit.value && props.service
        ? await updateMutation.mutateAsync({ ...dto, id: props.service.id })
        : await createMutation.mutateAsync(dto)
    await showToast(t('services.form.saveSuccess'), 'success')
    emit('saved', saved)
    close()
  } catch {
    await showToast(t('services.form.errorTitle'), 'danger')
  }
}

function onDelete() {
  if (!props.service) return
  const service = props.service
  close()
  emit('delete', service)
}
</script>

<template>
  <ion-modal
    ref="selfModal"
    :is-open="isOpen"
    :presenting-element="presentingElement ?? undefined"
    @did-dismiss="close"
  >
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button :disabled="isLoading" @click="close">
            {{ $t('services.form.cancel') }}
          </ion-button>
        </ion-buttons>
        <ion-title>
          {{ isEdit ? $t('services.form.editTitle') : $t('services.form.createTitle') }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button strong :disabled="isLoading" @click="onSubmit">
            <ion-spinner v-if="isLoading" name="crescent" />
            <span v-else>{{ $t('services.form.save') }}</span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding-vertical">
      <form @submit.prevent="onSubmit">
        <ion-list inset>
          <ion-item>
            <ion-input
              v-model="state.name"
              label-placement="stacked"
              :label="$t('services.form.name')"
              :placeholder="$t('services.form.namePlaceholder')"
              :class="{ 'ion-invalid': errors.name, 'ion-touched': submitted }"
              :error-text="errors.name"
              autocapitalize="sentences"
              enterkeyhint="next"
            />
          </ion-item>
          <ion-item>
            <ion-textarea
              v-model="state.description"
              :auto-grow="true"
              :rows="3"
              label-placement="stacked"
              :label="$t('services.form.description')"
              :placeholder="$t('services.form.descriptionPlaceholder')"
              :class="{ 'ion-invalid': errors.description, 'ion-touched': submitted }"
              :error-text="errors.description"
            />
          </ion-item>
        </ion-list>

        <ion-list inset>
          <ion-item :class="{ 'ion-invalid': errors.duration, 'ion-touched': submitted }">
            <ion-select
              v-model="state.duration"
              label-placement="stacked"
              :label="$t('services.form.duration')"
              :placeholder="$t('services.form.duration')"
              interface="action-sheet"
            >
              <ion-select-option v-for="n in DURATION_OPTIONS" :key="n" :value="n">
                {{ $t('services.form.minutesLabel', { n }) }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          <ion-note v-if="errors.duration" color="danger" class="field-error">
            {{ errors.duration }}
          </ion-note>
          <ion-item>
            <ion-input
              v-model="state.price"
              type="number"
              inputmode="decimal"
              min="0"
              label-placement="stacked"
              :label="$t('services.form.price')"
              :placeholder="$t('services.form.pricePlaceholder')"
              :class="{ 'ion-invalid': errors.price, 'ion-touched': submitted }"
              :error-text="errors.price"
            />
          </ion-item>
        </ion-list>

        <ion-list inset>
          <ion-item button :detail="false" lines="none" @click="isCategoryPickerOpen = true">
            <ion-label>{{ $t('services.form.category') }}</ion-label>
            <div slot="end" class="category-value">
              <span>{{ selectedCategoryName }}</span>
              <ion-icon :icon="chevronForward" aria-hidden="true" />
            </div>
          </ion-item>
        </ion-list>

        <ion-list inset>
          <ion-list-header>
            <ion-label>{{ $t('services.form.color') }}</ion-label>
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

        <ion-list inset>
          <ion-item lines="none">
            <ion-toggle v-model="state.is_active">{{ $t('services.form.isActive') }}</ion-toggle>
          </ion-item>
        </ion-list>

        <ion-list v-if="isEdit" inset>
          <ion-item button lines="none" :disabled="isLoading" @click="onDelete">
            <ion-label color="danger">{{ $t('services.deleteAction') }}</ion-label>
          </ion-item>
        </ion-list>

        <!-- Lets the keyboard "go" action submit the form. -->
        <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true" />
      </form>

      <service-category-picker-mobile
        v-model:is-open="isCategoryPickerOpen"
        :selected-id="state.category_id"
        :presenting-element="selfModalEl"
        @select="onCategorySelect"
      />
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.field-error {
  display: block;
  padding-inline: 16px;
  padding-top: 4px;
  font-size: 0.75rem;
}

.category-value {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--ion-color-medium);
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
