<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Joi from 'joi'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useOnboardingStore } from '@features/onboarding'
import { COUNTRIES, detectCountry } from '@shared/lib/countries'
import { AddressAutocomplete } from '@shared/ui/address-autocomplete'
import type {
  IGoogleAutocompleteItem,
  IGoogleAddressComponent,
} from '@shared/ui/address-autocomplete'

const { t } = useI18n()
const router = useRouter()
const store = useOnboardingStore()

interface Step3Data {
  country: string
  address: string
  houseNumber: string
  zipCode: string
  city: string
  placeId: string
  worksAtPlace: boolean
  canTravel: boolean
}

const state = reactive<Step3Data>({
  country: store.location.country,
  address: store.location.address,
  houseNumber: store.location.houseNumber,
  zipCode: store.location.zipCode,
  city: store.location.city,
  placeId: store.location.placeId,
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
  placeId: Joi.string().allow('').optional(),
  worksAtPlace: Joi.boolean(),
  canTravel: Joi.boolean(),
})

function handleAddressField(payload: IGoogleAutocompleteItem) {
  if (!payload.name && !payload.address_components?.length) {
    state.address = ''
    return
  }

  const city = payload.address_components.find(
    (i: IGoogleAddressComponent) => i.types.includes('postal_town') || i.types.includes('locality'),
  )
  const street = payload.address_components.find((i: IGoogleAddressComponent) =>
    i.types.includes('route'),
  )
  const streetNumber = payload.address_components.find((i: IGoogleAddressComponent) =>
    i.types.includes('street_number'),
  )
  const postalCode = payload.address_components.find((i: IGoogleAddressComponent) =>
    i.types.includes('postal_code'),
  )

  state.address = street?.long_name ?? state.address
  state.houseNumber = streetNumber?.long_name ?? ''
  state.city = city?.long_name ?? ''
  state.zipCode = postalCode?.long_name ?? ''
  state.placeId = payload.place_id
}

function onSubmit(event: FormSubmitEvent<Step3Data>) {
  store.setLocation({
    country: event.data.country,
    address: event.data.address,
    houseNumber: event.data.houseNumber,
    zipCode: event.data.zipCode,
    city: event.data.city,
    placeId: event.data.placeId,
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

    <!--    <UAlert-->
    <!--      icon="i-lucide-info"-->
    <!--      color="primary"-->
    <!--      variant="soft"-->
    <!--      :description="$t('onboarding.step3.skipHint')"-->
    <!--      class="mb-4"-->
    <!--    />-->

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
          <AddressAutocomplete
            v-model="state.address"
            :placeholder="$t('onboarding.step3.addressPlaceholder')"
            :component-restrictions="
              state.country ? { country: state.country.toLowerCase() } : undefined
            "
            class="w-full"
            @place-changed="handleAddressField"
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
