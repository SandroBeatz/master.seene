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
  IonTextarea,
  IonLabel,
  IonNote,
  IonSpinner,
  toastController,
} from '@ionic/vue'
import {
  useCreateClientMutation,
  useUpdateClientMutation,
  type Client,
  type CreateClientDto,
} from '@entities/client'
import { useSessionStore } from '@entities/session'

const props = defineProps<{
  isOpen: boolean
  mode: 'create' | 'edit'
  client?: Client | null
  // The list/detail page passes its router outlet so the modal renders as an
  // iOS card (page scaled behind the sheet). Optional — plain sheet otherwise.
  presentingElement?: HTMLElement | null
}>()

const emit = defineEmits<{
  'update:isOpen': [boolean]
  // The created/updated client is passed so callers can react (e.g. navigate).
  saved: [client: Client]
}>()

const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const isEdit = computed(() => props.mode === 'edit')

interface FormState {
  firstName: string
  lastName: string
  email: string
  birthday: string
  notes: string
}

const state = reactive<FormState>({
  firstName: '',
  lastName: '',
  email: '',
  birthday: '',
  notes: '',
})

const phone = ref('')
const phoneValid = ref(false)

// Field-level errors keyed by form field; populated on submit attempt.
const errors = reactive<Record<string, string>>({})
const submitted = ref(false)

function onPhoneValidate(obj: { valid?: boolean }) {
  phoneValid.value = !!obj.valid
  if (submitted.value && phoneValid.value) delete errors.phone
}

function resetForm() {
  submitted.value = false
  for (const key of Object.keys(errors)) delete errors[key]
  if (isEdit.value && props.client) {
    state.firstName = props.client.first_name
    state.lastName = props.client.last_name ?? ''
    state.email = props.client.email ?? ''
    state.birthday = props.client.birthday ?? ''
    state.notes = props.client.notes ?? ''
    phone.value = props.client.phone
    phoneValid.value = true
  } else {
    state.firstName = ''
    state.lastName = ''
    state.email = ''
    state.birthday = ''
    state.notes = ''
    phone.value = ''
    phoneValid.value = false
  }
}

// Re-seed the fields every time the sheet opens so a reused component instance
// never shows a previous client's data.
watch(
  () => props.isOpen,
  (open) => {
    if (open) resetForm()
  },
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

function validate(): boolean {
  for (const key of Object.keys(errors)) delete errors[key]
  const { error } = schema.validate(
    {
      firstName: state.firstName,
      lastName: state.lastName,
      email: state.email,
      birthday: state.birthday,
      notes: state.notes,
    },
    { abortEarly: false },
  )
  if (error) {
    for (const detail of error.details) {
      const field = String(detail.path[0])
      if (errors[field]) continue
      if (field === 'firstName') errors.firstName = t('clients.form.firstNameRequired')
      else if (field === 'email') errors.email = t('clients.form.emailInvalid')
    }
  }
  if (!phoneValid.value) errors.phone = t('clients.form.phoneRequired')
  return Object.keys(errors).length === 0
}

const createMutation = useCreateClientMutation(userId)
const updateMutation = useUpdateClientMutation(userId)
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

  const dto: CreateClientDto = {
    first_name: state.firstName.trim(),
    last_name: state.lastName.trim() || null,
    phone: phone.value,
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
    emit('saved', saved)
    close()
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    await showToast(
      code === '23505' ? t('clients.form.duplicatePhone') : t('clients.form.errorTitle'),
      'danger',
    )
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
            {{ $t('clients.form.cancel') }}
          </ion-button>
        </ion-buttons>
        <ion-title>
          {{ isEdit ? $t('clients.form.titleEdit') : $t('clients.form.titleCreate') }}
        </ion-title>
        <ion-buttons slot="end">
          <ion-button strong :disabled="isLoading" @click="onSubmit">
            <ion-spinner v-if="isLoading" name="crescent" />
            <span v-else>
              {{ isEdit ? $t('clients.form.submitEdit') : $t('clients.form.submitCreate') }}
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
              v-model="state.firstName"
              label-placement="stacked"
              :label="$t('clients.form.firstNameLabel')"
              :class="{ 'ion-invalid': errors.firstName, 'ion-touched': submitted }"
              :error-text="errors.firstName"
              autocapitalize="words"
              enterkeyhint="next"
            />
          </ion-item>
          <ion-item>
            <ion-input
              v-model="state.lastName"
              label-placement="stacked"
              :label="$t('clients.form.lastNameLabel')"
              autocapitalize="words"
              enterkeyhint="next"
            />
          </ion-item>
        </ion-list>

        <ion-list inset>
          <ion-item lines="none">
            <ion-label position="stacked">{{ $t('clients.form.phoneLabel') }}</ion-label>
            <vue-tel-input
              v-model="phone"
              class="client-phone"
              mode="international"
              :input-options="{
                placeholder: $t('clients.form.phonePlaceholder'),
                showDialCode: true,
              }"
              @validate="onPhoneValidate"
            />
          </ion-item>
          <ion-note v-if="errors.phone" color="danger" class="client-phone-error">
            {{ errors.phone }}
          </ion-note>
        </ion-list>

        <ion-list inset>
          <ion-item>
            <ion-input
              v-model="state.email"
              type="email"
              inputmode="email"
              autocapitalize="off"
              label-placement="stacked"
              :label="$t('clients.form.emailLabel')"
              :class="{ 'ion-invalid': errors.email, 'ion-touched': submitted }"
              :error-text="errors.email"
            />
          </ion-item>
          <ion-item>
            <ion-input
              v-model="state.birthday"
              type="date"
              label-placement="stacked"
              :label="$t('clients.form.birthdayLabel')"
            />
          </ion-item>
        </ion-list>

        <ion-list inset>
          <ion-item>
            <ion-textarea
              v-model="state.notes"
              :auto-grow="true"
              :rows="3"
              label-placement="stacked"
              :label="$t('clients.form.notesLabel')"
            />
          </ion-item>
        </ion-list>

        <!-- Lets the keyboard "go" action submit the form. -->
        <button type="submit" class="sr-only" tabindex="-1" aria-hidden="true" />
      </form>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
/* vue-tel-input is a light-DOM component, so it needs to be nudged to match the
   Ionic list items it sits between. */
.client-phone {
  width: 100%;
  margin-top: 6px;
  border-radius: 8px;
  --vti-border-radius: 8px;
}

.client-phone-error {
  display: block;
  padding-inline: 16px;
  padding-top: 4px;
  font-size: 0.75rem;
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
