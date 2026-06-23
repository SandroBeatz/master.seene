<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Joi from 'joi'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useSessionStore } from '@entities/session'
import { supabase } from '@shared/lib/supabase'

defineOptions({ name: 'AccountEmailRow' })

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()

const currentEmail = computed(() => sessionStore.session?.user.email ?? '')

const isOpen = ref(false)
const isLoading = ref(false)

interface FormState {
  email: string
}

const state = reactive<FormState>({ email: '' })

watch(isOpen, (open) => {
  if (open) state.email = ''
})

const schema = computed(() =>
  Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        'string.empty': t('auth.validation.emailRequired'),
        'string.email': t('auth.validation.emailInvalid'),
        'any.required': t('auth.validation.emailRequired'),
      }),
  }),
)

async function onSubmit(event: FormSubmitEvent<FormState>) {
  isLoading.value = true
  try {
    const { error } = await supabase.auth.updateUser(
      { email: event.data.email },
      { emailRedirectTo: window.location.origin },
    )
    if (error) {
      toast.add({ title: t('settings.account.email.errorToast'), description: error.message, color: 'error' })
      return
    }
    toast.add({ title: t('settings.account.email.confirmationSentToast'), color: 'success' })
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
      <span class="font-medium text-highlighted">{{ t('settings.account.email.label') }}</span>
      <span class="text-sm text-muted">{{ currentEmail || t('settings.account.email.notSet') }}</span>
    </div>
    <UButton
      class="shrink-0"
      color="neutral"
      variant="outline"
      leading-icon="i-lucide-mail"
      @click="isOpen = true"
    >
      {{ t('settings.account.email.changeButton') }}
    </UButton>

    <UModal
      v-model:open="isOpen"
      :title="t('settings.account.email.modalTitle')"
      :description="t('settings.account.email.modalDescription')"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <UForm ref="formRef" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
          <UFormField :label="t('settings.account.email.newEmailLabel')" name="email" required>
            <UInput
              v-model="state.email"
              type="email"
              :placeholder="t('settings.account.email.newEmailPlaceholder')"
              class="w-full"
            />
          </UFormField>
        </UForm>
      </template>

      <template #footer="{ close }">
        <UButton color="neutral" variant="outline" @click="close">
          {{ t('common.cancel') }}
        </UButton>
        <UButton color="primary" :loading="isLoading" @click="submitForm">
          {{ t('settings.account.email.submit') }}
        </UButton>
      </template>
    </UModal>
  </div>
</template>
