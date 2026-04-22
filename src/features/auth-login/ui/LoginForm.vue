<script setup lang="ts">
import { reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import Joi from 'joi'
import type { FormSubmitEvent } from '@nuxt/ui'
import { AppFullLogo } from '@shared/ui'

const { t } = useI18n()

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

const state = reactive<{ email: string | undefined; password: string | undefined }>({
  email: undefined,
  password: undefined,
})

const remember = reactive({ value: false })

const toast = useToast()

async function onSubmit(event: FormSubmitEvent<typeof state>) {
  toast.add({ title: t('auth.login.successTitle'), color: 'success' })
  console.log('Sign in:', event.data)
}
</script>

<template>
  <div class="w-full max-w-sm">
    <div class="flex flex-col items-center text-center gap-2 pb-8">
      <div class="pb-10">
        <AppFullLogo class="w-52 h-10" />
      </div>

      <h1 class="text-2xl font-bold text-primary">
        {{ $t('auth.login.title') }}
      </h1>
      <p class="text-sm text-zinc-500 dark:text-zinc-400">
        {{ $t('auth.login.subtitle') }}
      </p>
    </div>

    <UForm :schema="schema" :state="state" class="flex flex-col gap-4" @submit="onSubmit">
      <UFormField :label="$t('auth.login.email')" name="email">
        <UInput
          v-model="state.email"
          type="email"
          :placeholder="$t('auth.login.emailPlaceholder')"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('auth.login.password')" name="password">
        <UInput v-model="state.password" type="password" placeholder="••••••••" class="w-full" />
      </UFormField>

      <div class="flex items-center justify-between">
        <UCheckbox v-model="remember.value" :label="$t('auth.login.rememberMe')" />
        <UButton variant="link" color="primary" size="sm" type="button">
          {{ $t('auth.login.forgotPassword') }}
        </UButton>
      </div>

      <UButton type="submit" block color="primary">
        {{ $t('auth.login.signIn') }}
      </UButton>

      <UButton
        block
        variant="outline"
        color="neutral"
        leading-icon="i-logos-google-icon"
        type="button"
      >
        {{ $t('auth.login.signInGoogle') }}
      </UButton>
    </UForm>

    <p class="text-center text-sm text-zinc-500 dark:text-zinc-400 pt-6">
      {{ $t('auth.login.noAccount') }}
      <UButton variant="link" color="primary" size="sm" type="button">
        {{ $t('auth.login.signUpFree') }}
      </UButton>
    </p>
  </div>
</template>
