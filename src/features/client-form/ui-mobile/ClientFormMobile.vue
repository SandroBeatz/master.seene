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
  IonLabel,
  IonNote,
  IonIcon,
  IonSpinner,
  alertController,
  isPlatform,
  toastController,
} from '@ionic/vue'
import { closeOutline } from 'ionicons/icons'
import {
  useCreateClientMutation,
  useUpdateClientMutation,
  type Client,
  type CreateClientDto,
} from '@entities/client'
import { useMasterProfileQuery } from '@entities/master'
import { useSessionStore } from '@entities/session'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import { PhoneField } from '@shared/ui/phone-field/index.mobile'

const props = defineProps<{
  isOpen: boolean
  mode: 'create' | 'edit'
  client?: Client | null
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [boolean]
  saved: [client: Client]
}>()

const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')
const { data: masterProfile } = useMasterProfileQuery(userId)
const isEdit = computed(() => props.mode === 'edit')
const spinnerName = isPlatform('ios') ? 'dots' : 'crescent'

interface FormState {
  firstName: string
  lastName: string
  phone: string
  email: string
  birthday: string
  notes: string
}

const state = reactive<FormState>({
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  birthday: '',
  notes: '',
})
const initialState = ref<FormState>({ ...state })
const phoneValid = ref(false)
const errors = reactive<Record<string, string>>({})
const submitted = ref(false)
const isSubmitting = ref(false)
const allowDismiss = ref(false)

const selfModal = ref<{ $el: HTMLElement } | null>(null)
const selfModalEl = computed(() => selfModal.value?.$el ?? null)

function currentState(): FormState {
  return { ...state }
}

function clearErrors() {
  for (const key of Object.keys(errors)) delete errors[key]
}

function resetForm() {
  submitted.value = false
  allowDismiss.value = false
  clearErrors()

  if (isEdit.value && props.client) {
    state.firstName = props.client.first_name
    state.lastName = props.client.last_name ?? ''
    state.phone = props.client.phone
    state.email = props.client.email ?? ''
    state.birthday = props.client.birthday ?? ''
    state.notes = props.client.notes ?? ''
    phoneValid.value = true
  } else {
    state.firstName = ''
    state.lastName = ''
    state.phone = ''
    state.email = ''
    state.birthday = ''
    state.notes = ''
    phoneValid.value = false
  }

  initialState.value = currentState()
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) resetForm()
  },
)

const isDirty = computed(() =>
  (Object.keys(state) as (keyof FormState)[]).some((key) => state[key] !== initialState.value[key]),
)
const isFormValid = computed(
  () =>
    state.firstName.trim().length > 0 &&
    state.firstName.trim().length <= 100 &&
    state.lastName.length <= 100 &&
    state.notes.length <= 2000 &&
    phoneValid.value,
)

const schema = Joi.object({
  firstName: Joi.string().trim().min(1).max(100).required(),
  lastName: Joi.string().max(100).allow('', null),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .allow('', null),
  birthday: Joi.string().allow('', null),
  notes: Joi.string().max(2000).allow('', null),
})

function onPhoneValidate({ valid }: { valid: boolean }) {
  phoneValid.value = valid
  if (submitted.value && valid) delete errors.phone
}

function validate(): boolean {
  clearErrors()
  const { error } = schema.validate(state, { abortEarly: false, stripUnknown: true })
  for (const detail of error?.details ?? []) {
    const field = String(detail.path[0])
    if (errors[field]) continue
    if (field === 'firstName') errors.firstName = t('clients.form.firstNameRequired')
    else if (field === 'email') errors.email = t('clients.form.emailInvalid')
  }
  if (!phoneValid.value) errors.phone = t('clients.form.phoneRequired')
  return Object.keys(errors).length === 0
}

const createMutation = useCreateClientMutation(userId)
const updateMutation = useUpdateClientMutation(userId)
const isLoading = computed(
  () => isSubmitting.value || createMutation.isLoading.value || updateMutation.isLoading.value,
)
const canSubmit = computed(() => isFormValid.value && isDirty.value && !isLoading.value)

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
  emit('update:isOpen', false)
}

async function onSubmit() {
  submitted.value = true
  if (!validate() || !canSubmit.value) return
  isSubmitting.value = true

  const dto: CreateClientDto = {
    first_name: state.firstName.trim(),
    last_name: state.lastName.trim() || null,
    phone: state.phone,
    email: state.email.trim() || null,
    birthday: state.birthday || null,
    notes: state.notes.trim() || null,
    source: props.client?.source ?? 'manual',
  }

  try {
    const saved =
      isEdit.value && props.client
        ? await updateMutation.mutateAsync({ ...dto, id: props.client.id })
        : await createMutation.mutateAsync(dto)
    await showToast(
      isEdit.value ? t('clients.form.successEdit') : t('clients.form.successCreate'),
      'success',
    )
    initialState.value = currentState()
    allowDismiss.value = true
    emit('saved', saved)
    emit('update:isOpen', false)
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code
    await showToast(
      code === '23505' ? t('clients.form.duplicatePhone') : t('clients.form.errorTitle'),
      'danger',
    )
  } finally {
    isSubmitting.value = false
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
          {{ isEdit ? $t('clients.form.titleEdit') : $t('clients.form.titleCreate') }}
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding-vertical">
      <form id="client-form" @submit.prevent="onSubmit">
        <inset-list>
          <ion-item :class="{ 'ion-invalid': errors.firstName, 'ion-touched': submitted }">
            <ion-label class="field-label">{{ $t('clients.form.firstNameLabel') }}</ion-label>
            <ion-input
              v-model="state.firstName"
              class="value-input"
              :maxlength="100"
              autocapitalize="words"
              enterkeyhint="next"
            />
          </ion-item>
          <ion-item>
            <ion-label class="field-label">{{ $t('clients.form.lastNameLabel') }}</ion-label>
            <ion-input
              v-model="state.lastName"
              class="value-input"
              :maxlength="100"
              autocapitalize="words"
              enterkeyhint="next"
            />
          </ion-item>
          <phone-field
            v-model="state.phone"
            :default-country="masterProfile?.country"
            :label="$t('clients.form.phoneLabel')"
            :placeholder="$t('clients.form.phonePlaceholder')"
            :invalid="Boolean(errors.phone)"
            :presenting-element="selfModalEl"
            @validate="onPhoneValidate"
          />
        </inset-list>
        <ion-note v-if="errors.firstName" color="danger" class="field-hint">
          {{ errors.firstName }}
        </ion-note>
        <ion-note v-if="errors.phone" color="danger" class="field-hint">
          {{ errors.phone }}
        </ion-note>

        <inset-list>
          <ion-item :class="{ 'ion-invalid': errors.email, 'ion-touched': submitted }">
            <ion-label class="field-label">{{ $t('clients.form.emailLabel') }}</ion-label>
            <ion-input
              v-model="state.email"
              class="value-input"
              type="email"
              inputmode="email"
              autocapitalize="off"
              enterkeyhint="next"
            />
          </ion-item>
          <ion-item lines="none">
            <ion-label class="field-label">{{ $t('clients.form.birthdayLabel') }}</ion-label>
            <ion-input v-model="state.birthday" class="value-input" type="date" />
          </ion-item>
        </inset-list>
        <ion-note v-if="errors.email" color="danger" class="field-hint">
          {{ errors.email }}
        </ion-note>

        <inset-list :header="$t('clients.form.notesLabel')">
          <ion-item lines="none" class="notes-item">
            <ion-textarea
              v-model="state.notes"
              :auto-grow="true"
              :rows="4"
              :maxlength="2000"
              :counter="true"
            />
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
          :disabled="!canSubmit"
          :aria-busy="isLoading"
          @click="onSubmit"
        >
          <span :class="{ 'save-button-label--hidden': isLoading }">
            {{ isEdit ? $t('clients.form.submitEdit') : $t('clients.form.submitCreate') }}
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
  --padding-top: 7px;
  --padding-bottom: 7px;
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
  --padding-start: 0;
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

.notes-item {
  --padding-top: 8px;
  --padding-bottom: 4px;
}

.notes-item ion-textarea {
  margin: 0;
  font-size: 0.94rem;
}

ion-footer ion-toolbar {
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 10px;
  --padding-bottom: calc(10px + var(--safe-area-bottom));
  --background: var(--se-surface-page, #f2f2f7);
}

.save-button {
  min-height: 48px;
  margin: 0;
  font-weight: 600;
  --border-radius: 12px;
}

.save-button-label--hidden {
  visibility: hidden;
}

.save-button-spinner {
  position: absolute;
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
