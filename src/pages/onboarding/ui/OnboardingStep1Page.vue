<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Joi from 'joi'
import type { FormSubmitEvent } from '@nuxt/ui'
import { AppFullLogo } from '@shared/ui'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()

const schema = Joi.object({
  name: Joi.string()
    .min(2)
    .required()
    .messages({
      'string.empty': t('onboarding.validation.nameRequired'),
      'string.min': t('onboarding.validation.nameMin'),
    }),
  phone: Joi.string()
    .required()
    .messages({
      'string.empty': t('onboarding.validation.phoneRequired'),
    }),
  specialty: Joi.string()
    .required()
    .messages({
      'string.empty': t('onboarding.validation.specialtyRequired'),
    }),
})

const fields = computed(() => [
  {
    name: 'name',
    type: 'text' as const,
    label: t('onboarding.step1.name'),
    placeholder: t('onboarding.step1.namePlaceholder'),
    required: true,
  },
  {
    name: 'phone',
    type: 'text' as const,
    label: t('onboarding.step1.phone'),
    placeholder: t('onboarding.step1.phonePlaceholder'),
    required: true,
  },
  {
    name: 'specialty',
    type: 'text' as const,
    label: t('onboarding.step1.specialty'),
    placeholder: t('onboarding.step1.specialtyPlaceholder'),
    required: true,
  },
])

interface OnboardingStep1Data {
  name: string
  phone: string
  specialty: string
}

async function onSubmit(event: FormSubmitEvent<OnboardingStep1Data>) {
  console.log('Onboarding step 1:', event.data)
  toast.add({ title: t('onboarding.step1.successTitle'), color: 'success' })
  router.push('/home')
}
</script>

<template>
  <div class="py-8">
    <UAuthForm
      :schema="schema"
      :fields="fields"
      :submit="{ label: t('onboarding.step1.submit') }"
      @submit="onSubmit"
    >
      <template #header>
        <div class="flex flex-col items-center text-center gap-2 pb-2">
          <h1 class="text-2xl font-bold text-primary">
            {{ $t('onboarding.step1.title') }}
          </h1>
          <p class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ $t('onboarding.step1.subtitle') }}
          </p>
        </div>
      </template>
    </UAuthForm>
  </div>
</template>
