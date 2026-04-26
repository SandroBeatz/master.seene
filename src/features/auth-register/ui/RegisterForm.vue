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
  name: Joi.string()
    .min(2)
    .required()
    .messages({
      'string.empty': t('auth.validation.nameRequired'),
      'string.min': t('auth.validation.nameRequired'),
    }),
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
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'string.empty': t('auth.validation.confirmPasswordRequired'),
      'any.only': t('auth.validation.confirmPasswordMatch'),
    }),
})

const fields = computed<AuthFormField[]>(() => [
  {
    name: 'name',
    type: 'text',
    label: t('auth.register.name'),
    placeholder: t('auth.register.namePlaceholder'),
    required: true,
  },
  {
    name: 'email',
    type: 'email',
    label: t('auth.register.email'),
    placeholder: t('auth.register.emailPlaceholder'),
    required: true,
  },
  {
    name: 'password',
    type: 'password',
    label: t('auth.register.password'),
    placeholder: t('auth.register.passwordPlaceholder'),
    required: true,
  },
  {
    name: 'confirmPassword',
    type: 'password',
    label: t('auth.register.confirmPassword'),
    placeholder: t('auth.register.confirmPasswordPlaceholder'),
    required: true,
  },
])

const providers = computed(() => [
  {
    label: t('auth.register.signUpGoogle'),
    icon: 'i-logos-google-icon',
    variant: 'soft',
    onClick: () => {
      toast.add({ title: 'Google', description: t('auth.register.signUpGoogle') })
    },
  },
  {
    label: t('auth.register.signUpApple'),
    icon: 'i-logos-apple',
    variant: 'soft',
    onClick: () => {
      toast.add({ title: 'Apple', description: t('auth.register.signUpApple') })
    },
  },
])

interface RegisterFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

async function onSubmit(event: FormSubmitEvent<RegisterFormData>) {
  const { error } = await supabase.auth.signUp({
    email: event.data.email,
    password: event.data.password,
  })
  if (error) {
    toast.add({ title: t('auth.register.errorTitle'), description: error.message, color: 'error' })
    return
  }
  router.push('/onboarding')
}
</script>

<template>
  <div class="w-full max-w-sm py-8">
    <UAuthForm
      :schema="schema"
      :fields="fields"
      :providers="providers"
      :submit="{ label: t('auth.register.signUp') }"
      @submit="onSubmit"
    >
      <template #header>
        <div class="flex flex-col items-center text-center gap-2 pb-2">
          <h1 class="text-2xl font-bold text-primary">
            {{ $t('auth.register.title') }}
          </h1>
          <p class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ $t('auth.register.subtitle') }}
          </p>
        </div>
      </template>
    </UAuthForm>

    <p class="text-center text-sm text-muted pt-4">
      {{ $t('auth.register.haveAccount') }}
      <UButton
        variant="link"
        color="primary"
        size="sm"
        type="button"
        @click="router.push('/login')"
      >
        {{ $t('auth.register.signIn') }}
      </UButton>
    </p>
  </div>
</template>
