<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Joi from 'joi'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useOnboardingStore } from '@features/onboarding'

const { t } = useI18n()
const router = useRouter()
const store = useOnboardingStore()

const CATEGORIES = [
  'makeup',
  'hair',
  'nails',
  'barber',
  'massage',
  'tattoo_piercing',
  'depilation',
  'cosmetology',
  'brows_lashes',
] as const

interface Step1Data {
  specializations: string[]
}

const state = reactive<Step1Data>({
  specializations: [...store.specializations],
})

const schema = Joi.object({
  specializations: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      'array.min': t('onboarding.step1.validation.minOne'),
      'array.base': t('onboarding.step1.validation.minOne'),
    }),
})

function toggle(key: string) {
  const idx = state.specializations.indexOf(key)
  if (idx >= 0) {
    state.specializations.splice(idx, 1)
  } else {
    state.specializations.push(key)
  }
}

function isSelected(key: string) {
  return state.specializations.includes(key)
}

function onSubmit(event: FormSubmitEvent<Step1Data>) {
  store.setSpecializations(event.data.specializations)
  router.push('/onboarding/step2')
}
</script>

<template>
  <div class="py-8 w-full">
    <div class="flex flex-col items-center text-center gap-2 mb-6">
      <h1 class="text-2xl font-bold text-primary">
        {{ $t('onboarding.step1.title') }}
      </h1>
      <p class="text-sm text-muted">
        {{ $t('onboarding.step1.subtitle') }}
      </p>
    </div>

    <UForm :schema="schema" :state="state" @submit="onSubmit">
      <UFormField name="specializations" class="mb-6">
        <div class="grid grid-cols-3 gap-2">
          <UButton
            v-for="key in CATEGORIES"
            :key="key"
            type="button"
            :variant="isSelected(key) ? 'solid' : 'soft'"
            color="primary"
            size="sm"
            class="justify-center"
            @click="toggle(key)"
          >
            {{ $t(`onboarding.step1.categories.${key}`) }}
          </UButton>
        </div>
      </UFormField>

      <UButton type="submit" color="primary" block>
        {{ $t('onboarding.step1.submit') }}
      </UButton>
    </UForm>
  </div>
</template>
