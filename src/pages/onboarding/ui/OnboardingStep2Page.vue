<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Joi from 'joi'
import type { FormSubmitEvent } from '@nuxt/ui'
import { supabase } from '@shared/lib/supabase'
import { useOnboardingStore } from '@features/onboarding'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const store = useOnboardingStore()

interface Step2Data {
  firstName: string
  lastName: string
  username: string
}

const state = reactive<Step2Data>({
  firstName: store.personal.firstName,
  lastName: store.personal.lastName,
  username: store.personal.username,
})

const phone = ref(store.personal.phone)
const phoneValid = ref(store.personal.phone.length > 0)

function onPhoneValidate(obj: { valid: boolean }) {
  phoneValid.value = obj.valid
}

const schema = Joi.object({
  firstName: Joi.string()
    .required()
    .messages({
      'string.empty': t('onboarding.step2.validation.firstNameRequired'),
    }),
  lastName: Joi.string()
    .required()
    .messages({
      'string.empty': t('onboarding.step2.validation.lastNameRequired'),
    }),
  username: Joi.string()
    .pattern(/^[a-z0-9_-]+$/)
    .required()
    .messages({
      'string.empty': t('onboarding.step2.validation.usernameRequired'),
      'string.pattern.base': t('onboarding.step2.validation.usernameInvalid'),
    }),
})

const isSubmitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Step2Data>) {
  if (!phoneValid.value) {
    toast.add({
      title: t('onboarding.step2.validation.phoneInvalid'),
      color: 'error',
    })
    return
  }

  isSubmitting.value = true
  try {
    const { data: existing } = await supabase
      .from('master_profile')
      .select('id')
      .eq('username', event.data.username)
      .maybeSingle()

    if (existing) {
      toast.add({
        title: t('onboarding.step2.validation.usernameTaken'),
        color: 'error',
      })
      return
    }

    store.setPersonal({
      firstName: event.data.firstName,
      lastName: event.data.lastName,
      phone: phone.value,
      username: event.data.username,
    })
    router.push('/onboarding/step3')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="w-full">
    <div class="flex flex-col items-center text-center gap-2 pt-4 mb-6">
      <h1 class="text-2xl font-bold text-primary">
        {{ $t('onboarding.step2.title') }}
      </h1>
      <p class="text-sm text-muted">
        {{ $t('onboarding.step2.subtitle') }}
      </p>
    </div>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <div class="grid grid-cols-2 gap-3">
        <UFormField :label="$t('onboarding.step2.firstName')" name="firstName">
          <UInput
            v-model="state.firstName"
            :placeholder="$t('onboarding.step2.firstNamePlaceholder')"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="$t('onboarding.step2.lastName')" name="lastName">
          <UInput
            v-model="state.lastName"
            :placeholder="$t('onboarding.step2.lastNamePlaceholder')"
            class="w-full"
          />
        </UFormField>
      </div>

      <UFormField :label="$t('onboarding.step2.phone')" name="phone">
        <vue-tel-input
          v-model="phone"
          mode="international"
          :input-options="{
            placeholder: $t('onboarding.step2.phonePlaceholder'),
            showDialCode: true,
          }"
          @validate="onPhoneValidate"
        />
      </UFormField>

      <UFormField
        :label="$t('onboarding.step2.username')"
        name="username"
        :help="$t('onboarding.step2.usernameHint', { username: state.username || '…' })"
      >
        <UInput
          v-model="state.username"
          :placeholder="$t('onboarding.step2.usernamePlaceholder')"
          class="w-full"
        />
      </UFormField>

      <div class="flex justify-between gap-3 pt-2">
        <UButton
          type="button"
          color="neutral"
          variant="subtle"
          @click="router.push('/onboarding/step1')"
        >
          {{ $t('onboarding.step2.back') }}
        </UButton>
        <UButton type="submit" color="primary" :loading="isSubmitting">
          {{ $t('onboarding.step2.submit') }}
        </UButton>
      </div>
    </UForm>
  </div>
</template>
