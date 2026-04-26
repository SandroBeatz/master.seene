<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Joi from 'joi'
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import { supabase } from '@shared/lib/supabase'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()

const schema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.empty': t('auth.validation.emailRequired'),
      'string.email': t('auth.validation.emailInvalid'),
    }),
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.empty': t('auth.validation.passwordRequired'),
      'string.min': t('auth.validation.passwordMin'),
    }),
})

const fields = computed<AuthFormField[]>(() => [
  {
    name: 'email',
    type: 'email',
    label: t('auth.login.email'),
    placeholder: t('auth.login.emailPlaceholder'),
    required: true,
  },
  {
    name: 'password',
    label: t('auth.login.password'),
    type: 'password',
    placeholder: t('auth.login.passwordPlaceholder'),
    required: true,
  },
])

const providers = computed(() => [
  {
    label: t('auth.login.signInGoogle'),
    icon: 'i-logos-google-icon',
    variant: 'soft',
    onClick: () => {
      toast.add({ title: 'Google', description: t('auth.login.signInGoogle') })
    },
  },
  {
    label: t('auth.login.signInApple'),
    icon: 'i-logos-apple',
    variant: 'soft',
    onClick: () => {
      toast.add({ title: 'Apple', description: t('auth.login.signInApple') })
    },
  },
])

interface LoginFormData {
  email: string
  password: string
}

async function onSubmit(event: FormSubmitEvent<LoginFormData>) {
  const { error } = await supabase.auth.signInWithPassword({
    email: event.data.email,
    password: event.data.password,
  })
  if (error) {
    toast.add({ title: t('auth.login.errorTitle'), description: error.message, color: 'error' })
    return
  }
  router.push('/home')
}
</script>

<template>
  <div class="w-full max-w-sm py-8">
    <UAuthForm :schema="schema" :fields="fields" :providers="providers" @submit="onSubmit">
      <template #footer>
        <div class="text-center">
          <UButton
            variant="link"
            color="primary"
            size="sm"
            type="button"
            @click="router.push('/forgot-password')"
          >
            {{ $t('auth.login.forgotPassword') }}
          </UButton>
        </div>
      </template>

      <template #header>
        <div class="flex flex-col items-center text-center gap-2 pb-2">
          <h1 class="text-2xl font-bold text-primary">
            {{ $t('auth.login.title') }}
          </h1>
          <p class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ $t('auth.login.subtitle') }}
          </p>
        </div>
      </template>
    </UAuthForm>

    <p class="text-center text-sm text-muted pt-4">
      {{ $t('auth.login.noAccount') }}
      <UButton
        variant="link"
        color="primary"
        size="sm"
        type="button"
        @click="router.push('/register')"
      >
        {{ $t('auth.login.signUpFree') }}
      </UButton>
    </p>
  </div>
</template>
