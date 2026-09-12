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
  IonItem,
  IonInput,
  IonSpinner,
  toastController,
} from '@ionic/vue'
import {
  useCreateServiceCategoryMutation,
  useUpdateServiceCategoryMutation,
  type ServiceCategory,
} from '@entities/service-category'
import { useSessionStore } from '@entities/session'

const props = defineProps<{
  isOpen: boolean
  mode: 'create' | 'edit'
  category?: ServiceCategory | null
  // The list page passes its router outlet so the modal renders as an iOS card
  // (page scaled behind the sheet). Optional — plain sheet otherwise.
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [boolean]
  saved: [category: ServiceCategory]
}>()

const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const isEdit = computed(() => props.mode === 'edit')

interface FormState {
  name: string
}

const state = reactive<FormState>({ name: '' })

const errors = reactive<Record<string, string>>({})
const submitted = ref(false)

function resetForm() {
  submitted.value = false
  for (const key of Object.keys(errors)) delete errors[key]
  state.name = isEdit.value && props.category ? props.category.name : ''
}

// Re-seed the field every time the sheet opens so a reused component instance
// never shows a previous category's data.
watch(
  () => props.isOpen,
  (open) => {
    if (open) resetForm()
  },
)

const schema = Joi.object({
  name: Joi.string().trim().min(1).max(50).required(),
})

function validate(): boolean {
  for (const key of Object.keys(errors)) delete errors[key]
  const { error } = schema.validate({ name: state.name }, { abortEarly: false })
  if (error) errors.name = t('common.validation.required')
  return Object.keys(errors).length === 0
}

const createMutation = useCreateServiceCategoryMutation(userId)
const updateMutation = useUpdateServiceCategoryMutation(userId)
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

  const name = state.name.trim()
  try {
    let saved: ServiceCategory
    if (isEdit.value && props.category) {
      saved = await updateMutation.mutateAsync({ id: props.category.id, name })
      await showToast(t('settings.serviceCategories.updateSuccess'), 'success')
    } else {
      saved = await createMutation.mutateAsync({ name })
      await showToast(t('settings.serviceCategories.createSuccess'), 'success')
    }
    emit('saved', saved)
    close()
  } catch {
    await showToast(t('settings.serviceCategories.saveError'), 'danger')
  }
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
            {{ $t('settings.serviceCategories.form.cancel') }}
          </ion-button>
        </ion-buttons>
        <ion-title>
          {{
            isEdit
              ? $t('settings.serviceCategories.form.titleEdit')
              : $t('settings.serviceCategories.form.titleCreate')
          }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button strong :disabled="isLoading" @click="onSubmit">
            <ion-spinner v-if="isLoading" name="crescent" />
            <span v-else>
              {{
                isEdit
                  ? $t('settings.serviceCategories.form.submitEdit')
                  : $t('settings.serviceCategories.form.submitCreate')
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
            <ion-input
              v-model="state.name"
              label-placement="stacked"
              :label="$t('settings.serviceCategories.form.name')"
              :placeholder="$t('settings.serviceCategories.form.namePlaceholder')"
              :class="{ 'ion-invalid': errors.name, 'ion-touched': submitted }"
              :error-text="errors.name"
              autocapitalize="words"
              enterkeyhint="done"
            />
          </ion-item>
        </ion-list>

        <!-- Lets the keyboard "done" action submit the form. -->
        <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true" />
      </form>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
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
