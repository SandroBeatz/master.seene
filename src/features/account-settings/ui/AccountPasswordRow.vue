<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Joi from 'joi'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useSessionStore } from '@entities/session'
import { supabase } from '@shared/lib/supabase'
import { useIsMobile } from '@shared/lib/viewport'

defineOptions({ name: 'AccountPasswordRow' })

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()
const isMobile = useIsMobile()

const isOpen = ref(false)
const isLoading = ref(false)

interface FormState {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const state = reactive<FormState>({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

watch(isOpen, (open) => {
  if (open) {
    state.currentPassword = ''
    state.newPassword = ''
    state.confirmPassword = ''
  }
})

const schema = computed(() =>
  Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'string.empty': t('auth.validation.passwordRequired'),
        'any.required': t('auth.validation.passwordRequired'),
      }),
    newPassword: Joi.string()
      .min(8)
      .required()
      .messages({
        'string.empty': t('auth.validation.passwordRequired'),
        'string.min': t('auth.validation.passwordMin'),
        'any.required': t('auth.validation.passwordRequired'),
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': t('settings.account.password.mismatchError'),
        'string.empty': t('auth.validation.passwordRequired'),
        'any.required': t('auth.validation.passwordRequired'),
      }),
  }),
)

async function onSubmit(event: FormSubmitEvent<FormState>) {
  const email = sessionStore.session?.user.email
  if (!email) return

  isLoading.value = true
  try {
    // Re-authenticate with the current password before changing it (best practice;
    // Supabase doesn't require it by default).
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email,
      password: event.data.currentPassword,
    })
    if (reauthError) {
      toast.add({ title: t('settings.account.password.currentPasswordError'), color: 'error' })
      return
    }

    const { error } = await supabase.auth.updateUser({ password: event.data.newPassword })
    if (error) {
      toast.add({
        title: t('settings.account.password.errorToast'),
        description: error.message,
        color: 'error',
      })
      return
    }

    toast.add({ title: t('settings.account.password.successToast'), color: 'success' })
    isOpen.value = false
  } finally {
    isLoading.value = false
  }
}

const formRef = ref<{ $el: HTMLFormElement } | null>(null)
function submitForm() {
  formRef.value?.$el?.requestSubmit()
}
</script>

<template>
  <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex flex-col gap-0.5">
      <span class="font-medium text-highlighted">{{ t('settings.account.password.label') }}</span>
      <span class="text-sm text-muted">{{ t('settings.account.password.description') }}</span>
    </div>
    <UButton
      class="shrink-0"
      color="neutral"
      variant="outline"
      leading-icon="i-lucide-key-round"
      @click="isOpen = true"
    >
      {{ t('settings.account.password.changeButton') }}
    </UButton>

    <UModal
      v-model:open="isOpen"
      :title="t('settings.account.password.modalTitle')"
      :fullscreen="isMobile"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <UForm ref="formRef" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
          <UFormField
            :label="t('settings.account.password.currentPasswordLabel')"
            name="currentPassword"
            required
          >
            <UInput v-model="state.currentPassword" type="password" class="w-full" />
          </UFormField>
          <UFormField
            :label="t('settings.account.password.newPasswordLabel')"
            name="newPassword"
            required
          >
            <UInput v-model="state.newPassword" type="password" class="w-full" />
          </UFormField>
          <UFormField
            :label="t('settings.account.password.confirmPasswordLabel')"
            name="confirmPassword"
            required
          >
            <UInput v-model="state.confirmPassword" type="password" class="w-full" />
          </UFormField>
        </UForm>
      </template>

      <template #footer="{ close }">
        <UButton color="neutral" variant="outline" @click="close">
          {{ t('common.cancel') }}
        </UButton>
        <UButton color="primary" :loading="isLoading" @click="submitForm">
          {{ t('settings.account.password.submit') }}
        </UButton>
      </template>
    </UModal>
  </div>
</template>
