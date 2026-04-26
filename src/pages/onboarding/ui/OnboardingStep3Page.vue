<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Joi from 'joi'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useOnboardingStore } from '@features/onboarding'

const { t } = useI18n()
const router = useRouter()
const store = useOnboardingStore()

// ISO 3166-1 country list (name + code)
const COUNTRIES = [
  { label: 'Afghanistan', value: 'AF' },
  { label: 'Albania', value: 'AL' },
  { label: 'Algeria', value: 'DZ' },
  { label: 'Argentina', value: 'AR' },
  { label: 'Armenia', value: 'AM' },
  { label: 'Australia', value: 'AU' },
  { label: 'Austria', value: 'AT' },
  { label: 'Azerbaijan', value: 'AZ' },
  { label: 'Bahrain', value: 'BH' },
  { label: 'Bangladesh', value: 'BD' },
  { label: 'Belarus', value: 'BY' },
  { label: 'Belgium', value: 'BE' },
  { label: 'Bolivia', value: 'BO' },
  { label: 'Bosnia and Herzegovina', value: 'BA' },
  { label: 'Brazil', value: 'BR' },
  { label: 'Bulgaria', value: 'BG' },
  { label: 'Cambodia', value: 'KH' },
  { label: 'Canada', value: 'CA' },
  { label: 'Chile', value: 'CL' },
  { label: 'China', value: 'CN' },
  { label: 'Colombia', value: 'CO' },
  { label: 'Costa Rica', value: 'CR' },
  { label: 'Croatia', value: 'HR' },
  { label: 'Cyprus', value: 'CY' },
  { label: 'Czech Republic', value: 'CZ' },
  { label: 'Denmark', value: 'DK' },
  { label: 'Dominican Republic', value: 'DO' },
  { label: 'Ecuador', value: 'EC' },
  { label: 'Egypt', value: 'EG' },
  { label: 'Estonia', value: 'EE' },
  { label: 'Ethiopia', value: 'ET' },
  { label: 'Finland', value: 'FI' },
  { label: 'France', value: 'FR' },
  { label: 'Georgia', value: 'GE' },
  { label: 'Germany', value: 'DE' },
  { label: 'Ghana', value: 'GH' },
  { label: 'Greece', value: 'GR' },
  { label: 'Guatemala', value: 'GT' },
  { label: 'Honduras', value: 'HN' },
  { label: 'Hong Kong', value: 'HK' },
  { label: 'Hungary', value: 'HU' },
  { label: 'Iceland', value: 'IS' },
  { label: 'India', value: 'IN' },
  { label: 'Indonesia', value: 'ID' },
  { label: 'Iran', value: 'IR' },
  { label: 'Iraq', value: 'IQ' },
  { label: 'Ireland', value: 'IE' },
  { label: 'Israel', value: 'IL' },
  { label: 'Italy', value: 'IT' },
  { label: 'Japan', value: 'JP' },
  { label: 'Jordan', value: 'JO' },
  { label: 'Kazakhstan', value: 'KZ' },
  { label: 'Kenya', value: 'KE' },
  { label: 'Kuwait', value: 'KW' },
  { label: 'Kyrgyzstan', value: 'KG' },
  { label: 'Latvia', value: 'LV' },
  { label: 'Lebanon', value: 'LB' },
  { label: 'Lithuania', value: 'LT' },
  { label: 'Luxembourg', value: 'LU' },
  { label: 'Malaysia', value: 'MY' },
  { label: 'Mexico', value: 'MX' },
  { label: 'Moldova', value: 'MD' },
  { label: 'Morocco', value: 'MA' },
  { label: 'Netherlands', value: 'NL' },
  { label: 'New Zealand', value: 'NZ' },
  { label: 'Nigeria', value: 'NG' },
  { label: 'Norway', value: 'NO' },
  { label: 'Pakistan', value: 'PK' },
  { label: 'Palestine', value: 'PS' },
  { label: 'Panama', value: 'PA' },
  { label: 'Paraguay', value: 'PY' },
  { label: 'Peru', value: 'PE' },
  { label: 'Philippines', value: 'PH' },
  { label: 'Poland', value: 'PL' },
  { label: 'Portugal', value: 'PT' },
  { label: 'Qatar', value: 'QA' },
  { label: 'Romania', value: 'RO' },
  { label: 'Russia', value: 'RU' },
  { label: 'Saudi Arabia', value: 'SA' },
  { label: 'Serbia', value: 'RS' },
  { label: 'Singapore', value: 'SG' },
  { label: 'Slovakia', value: 'SK' },
  { label: 'Slovenia', value: 'SI' },
  { label: 'South Africa', value: 'ZA' },
  { label: 'South Korea', value: 'KR' },
  { label: 'Spain', value: 'ES' },
  { label: 'Sri Lanka', value: 'LK' },
  { label: 'Sweden', value: 'SE' },
  { label: 'Switzerland', value: 'CH' },
  { label: 'Taiwan', value: 'TW' },
  { label: 'Tajikistan', value: 'TJ' },
  { label: 'Thailand', value: 'TH' },
  { label: 'Tunisia', value: 'TN' },
  { label: 'Turkey', value: 'TR' },
  { label: 'Turkmenistan', value: 'TM' },
  { label: 'Ukraine', value: 'UA' },
  { label: 'United Arab Emirates', value: 'AE' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'United States', value: 'US' },
  { label: 'Uruguay', value: 'UY' },
  { label: 'Uzbekistan', value: 'UZ' },
  { label: 'Venezuela', value: 'VE' },
  { label: 'Vietnam', value: 'VN' },
]

// Auto-detect country from browser locale
function detectCountry(): string {
  try {
    const locale = navigator.language || navigator.languages?.[0] || ''
    const parts = locale.split('-')

    if (parts.length >= 2) {
      const code = (parts[parts.length - 1] ?? '').toUpperCase()
      if (COUNTRIES.find((c) => c.value === code)) return code
    }
  } catch {
    // ignore
  }
  return ''
}

interface Step3Data {
  country: string
  address: string
  houseNumber: string
  zipCode: string
  city: string
  worksAtPlace: boolean
  canTravel: boolean
}

const state = reactive<Step3Data>({
  country: store.location.country,
  address: store.location.address,
  houseNumber: store.location.houseNumber,
  zipCode: store.location.zipCode,
  city: store.location.city,
  worksAtPlace: store.location.worksAtPlace,
  canTravel: store.location.canTravel,
})

onMounted(() => {
  if (!state.country) {
    state.country = detectCountry()
  }
})

const schema = Joi.object({
  country: Joi.string()
    .required()
    .messages({
      'string.empty': t('onboarding.step3.validation.countryRequired'),
      'any.required': t('onboarding.step3.validation.countryRequired'),
    }),
  address: Joi.string().allow('').optional(),
  houseNumber: Joi.string().allow('').optional(),
  zipCode: Joi.string().allow('').optional(),
  city: Joi.string().allow('').optional(),
  worksAtPlace: Joi.boolean(),
  canTravel: Joi.boolean(),
})

function onSubmit(event: FormSubmitEvent<Step3Data>) {
  store.setLocation({
    country: event.data.country,
    address: event.data.address,
    houseNumber: event.data.houseNumber,
    zipCode: event.data.zipCode,
    city: event.data.city,
    worksAtPlace: event.data.worksAtPlace,
    canTravel: event.data.canTravel,
  })
  router.push('/onboarding/step4')
}
</script>

<template>
  <div class="w-full">
    <div class="flex flex-col items-center text-center gap-2 pt-4 mb-6">
      <h1 class="text-2xl font-bold text-primary">
        {{ $t('onboarding.step3.title') }}
      </h1>
      <p class="text-sm text-muted">
        {{ $t('onboarding.step3.subtitle') }}
      </p>
    </div>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField :label="$t('onboarding.step3.country')" name="country" required>
        <USelectMenu
          v-model="state.country"
          :items="COUNTRIES"
          value-key="value"
          :placeholder="$t('onboarding.step3.countryPlaceholder')"
          searchable
          class="w-full"
        />
      </UFormField>

      <div class="grid grid-cols-3 gap-3">
        <UFormField :label="$t('onboarding.step3.address')" name="address" class="col-span-2">
          <UInput
            v-model="state.address"
            :placeholder="$t('onboarding.step3.addressPlaceholder')"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="$t('onboarding.step3.houseNumber')" name="houseNumber">
          <UInput
            v-model="state.houseNumber"
            :placeholder="$t('onboarding.step3.houseNumberPlaceholder')"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <UFormField :label="$t('onboarding.step3.zipCode')" name="zipCode">
          <UInput
            v-model="state.zipCode"
            :placeholder="$t('onboarding.step3.zipCodePlaceholder')"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="$t('onboarding.step3.city')" name="city" class="col-span-2">
          <UInput
            v-model="state.city"
            :placeholder="$t('onboarding.step3.cityPlaceholder')"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="flex flex-col gap-3 pt-1">
        <USwitch v-model="state.worksAtPlace" :label="$t('onboarding.step3.worksAtPlace')" />
        <USwitch v-model="state.canTravel" :label="$t('onboarding.step3.canTravel')" />
      </div>

      <div class="flex justify-between gap-3 pt-2">
        <UButton
          type="button"
          color="neutral"
          variant="subtle"
          @click="router.push('/onboarding/step2')"
        >
          {{ $t('onboarding.step3.back') }}
        </UButton>
        <UButton type="submit" color="primary">
          {{ $t('onboarding.step3.submit') }}
        </UButton>
      </div>
    </UForm>
  </div>
</template>
