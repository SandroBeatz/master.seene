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

interface Step3Data {
  city: string
  address: string
  zipCode: string
  floor: string
  apartment: string
  entranceCode: string
  worksAtPlace: boolean
  canTravel: boolean
}

const state = reactive<Step3Data>({
  city: store.location.city,
  address: store.location.address,
  zipCode: store.location.zipCode,
  floor: store.location.floor,
  apartment: store.location.apartment,
  entranceCode: store.location.entranceCode,
  worksAtPlace: store.location.worksAtPlace,
  canTravel: store.location.canTravel,
})

const schema = Joi.object({
  city: Joi.string().required().messages({
    'string.empty': t('onboarding.step3.validation.cityRequired'),
  }),
  address: Joi.string().required().messages({
    'string.empty': t('onboarding.step3.validation.addressRequired'),
  }),
  zipCode: Joi.string().required().messages({
    'string.empty': t('onboarding.step3.validation.zipCodeRequired'),
  }),
  floor: Joi.string().allow('').optional(),
  apartment: Joi.string().allow('').optional(),
  entranceCode: Joi.string().allow('').optional(),
  worksAtPlace: Joi.boolean(),
  canTravel: Joi.boolean(),
})

function onSubmit(event: FormSubmitEvent<Step3Data>) {
  store.setLocation({
    city: event.data.city,
    address: event.data.address,
    zipCode: event.data.zipCode,
    floor: event.data.floor,
    apartment: event.data.apartment,
    entranceCode: event.data.entranceCode,
    worksAtPlace: event.data.worksAtPlace,
    canTravel: event.data.canTravel,
  })
  router.push('/onboarding/step4')
}
</script>

<template>
  <div class="py-8 w-full">
    <div class="flex flex-col items-center text-center gap-2 mb-6">
      <h1 class="text-2xl font-bold text-primary">
        {{ $t('onboarding.step3.title') }}
      </h1>
      <p class="text-sm text-muted">
        {{ $t('onboarding.step3.subtitle') }}
      </p>
    </div>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField :label="$t('onboarding.step3.city')" name="city">
        <UInput
          v-model="state.city"
          :placeholder="$t('onboarding.step3.cityPlaceholder')"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="$t('onboarding.step3.address')" name="address">
        <UInput
          v-model="state.address"
          :placeholder="$t('onboarding.step3.addressPlaceholder')"
          class="w-full"
        />
      </UFormField>

      <div class="grid grid-cols-2 gap-3">
        <UFormField :label="$t('onboarding.step3.zipCode')" name="zipCode">
          <UInput
            v-model="state.zipCode"
            :placeholder="$t('onboarding.step3.zipCodePlaceholder')"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="$t('onboarding.step3.floor')" name="floor">
          <UInput
            v-model="state.floor"
            :placeholder="$t('onboarding.step3.floorPlaceholder')"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <UFormField :label="$t('onboarding.step3.apartment')" name="apartment">
          <UInput
            v-model="state.apartment"
            :placeholder="$t('onboarding.step3.apartmentPlaceholder')"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="$t('onboarding.step3.entranceCode')"
          name="entranceCode"
          :help="$t('onboarding.step3.entranceCodeHelp')"
        >
          <UInput
            v-model="state.entranceCode"
            :placeholder="$t('onboarding.step3.entranceCodePlaceholder')"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="flex flex-col gap-3 pt-1">
        <USwitch v-model="state.worksAtPlace" :label="$t('onboarding.step3.worksAtPlace')" />
        <USwitch v-model="state.canTravel" :label="$t('onboarding.step3.canTravel')" />
      </div>

      <div class="flex gap-3 pt-2">
        <UButton
          type="button"
          color="neutral"
          variant="soft"
          @click="router.push('/onboarding/step2')"
        >
          {{ $t('onboarding.step3.back') }}
        </UButton>
        <UButton type="submit" color="primary" class="flex-1">
          {{ $t('onboarding.step3.submit') }}
        </UButton>
      </div>
    </UForm>
  </div>
</template>
