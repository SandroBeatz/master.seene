<script setup lang="ts">
import Joi from 'joi'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormSubmitEvent } from '@nuxt/ui'
import {
  useCreateClientMutation,
  useUpdateClientMutation,
  type Client,
  type CreateClientDto,
} from '@entities/client'
import { useSessionStore } from '@entities/session'

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  client?: Client | null
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  saved: []
}>()

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

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

function onPhoneValidate(obj: { valid: boolean }) {
  phoneValid.value = obj.valid
}

function resetForm() {
  if (props.client && isEdit.value) {
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

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
  },
)

const schema = computed(() =>
  Joi.object({
    firstName: Joi.string()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.empty': t('clients.form.firstNameLabel') + ' ' + 'required',
        'any.required': t('clients.form.firstNameLabel') + ' ' + 'required',
      }),
    lastName: Joi.string().max(100).allow('', null).optional(),
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .allow('', null)
      .optional()
      .messages({
        'string.email': 'Invalid email',
      }),
    birthday: Joi.string().allow('', null).optional(),
    notes: Joi.string().max(2000).allow('', null).optional(),
  }),
)

const createMutation = useCreateClientMutation(userId)
const updateMutation = useUpdateClientMutation(userId)

const isLoading = computed(() => createMutation.isLoading.value || updateMutation.isLoading.value)

const formRef = ref<{ $el: HTMLFormElement } | null>(null)

function submitForm() {
  formRef.value?.$el?.requestSubmit()
}

async function onSubmit(event: FormSubmitEvent<FormState>) {
  if (!phoneValid.value) {
    toast.add({ title: t('clients.form.phonePlaceholder'), color: 'error' })
    return
  }

  const dto: CreateClientDto = {
    first_name: event.data.firstName,
    last_name: event.data.lastName || null,
    phone: phone.value,
    email: event.data.email || null,
    birthday: event.data.birthday || null,
    notes: event.data.notes || null,
    source: props.client?.source ?? 'manual',
  }

  try {
    if (isEdit.value && props.client) {
      await updateMutation.mutateAsync({ ...dto, id: props.client.id })
      toast.add({ title: t('clients.form.successEdit'), color: 'success' })
    } else {
      await createMutation.mutateAsync(dto)
      toast.add({ title: t('clients.form.successCreate'), color: 'success' })
    }
    isOpen.value = false
    emit('saved')
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    if (code === '23505') {
      toast.add({ title: t('clients.form.duplicatePhone'), color: 'error' })
    } else {
      toast.add({ title: t('clients.form.errorTitle'), color: 'error' })
    }
  }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="isEdit ? $t('clients.form.titleEdit') : $t('clients.form.titleCreate')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UForm ref="formRef" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <div class="grid grid-cols-2 gap-3">
          <UFormField :label="$t('clients.form.firstNameLabel')" name="firstName" required>
            <UInput v-model="state.firstName" class="w-full" />
          </UFormField>
          <UFormField :label="$t('clients.form.lastNameLabel')" name="lastName">
            <UInput v-model="state.lastName" class="w-full" />
          </UFormField>
        </div>

        <UFormField :label="$t('clients.form.phoneLabel')" name="phone" required>
          <vue-tel-input
            v-model="phone"
            mode="international"
            :input-options="{
              placeholder: $t('clients.form.phonePlaceholder'),
              showDialCode: true,
            }"
            @validate="onPhoneValidate"
          />
        </UFormField>

        <UFormField :label="$t('clients.form.emailLabel')" name="email">
          <UInput v-model="state.email" type="email" class="w-full" />
        </UFormField>

        <UFormField :label="$t('clients.form.birthdayLabel')" name="birthday">
          <UInput v-model="state.birthday" type="date" class="w-full" />
        </UFormField>

        <UFormField :label="$t('clients.form.notesLabel')" name="notes">
          <UTextarea v-model="state.notes" :rows="3" class="w-full" />
        </UFormField>
      </UForm>
    </template>

    <template #footer="{ close }">
      <UButton color="neutral" variant="outline" @click="close">
        {{ $t('clients.form.cancel') }}
      </UButton>
      <UButton color="primary" :loading="isLoading" @click="submitForm">
        {{ isEdit ? $t('clients.form.submitEdit') : $t('clients.form.submitCreate') }}
      </UButton>
    </template>
  </UModal>
</template>
