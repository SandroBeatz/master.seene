<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@entities/session'
import { useMasterProfileQuery, useUpdateMasterContactsMutation } from '@entities/master'
import type { MasterProfile } from '@entities/master'
import { useDirtyForm } from '@shared/lib/forms'
import { COUNTRIES } from '@shared/lib/countries'
import { AddressAutocomplete } from '@shared/ui/address-autocomplete'
import type {
  IGoogleAutocompleteItem,
  IGoogleAddressComponent,
} from '@shared/ui/address-autocomplete'
import { FormSaveBar, Typography } from '@shared/ui'

defineOptions({ name: 'ContactsForm' })

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: profileData } = useMasterProfileQuery(userId)
const updateMutation = useUpdateMasterContactsMutation(userId)

interface ContactsFormState {
  phone: string
  whatsapp: string
  telegram: string
  instagram: string
  tiktok: string
  contact_email: string
  country: string
  address: string
  house_number: string
  zip_code: string
  city: string
  place_id: string
  works_at_place: boolean
  can_travel: boolean
}

const state = ref<ContactsFormState>({
  phone: '',
  whatsapp: '',
  telegram: '',
  instagram: '',
  tiktok: '',
  contact_email: '',
  country: '',
  address: '',
  house_number: '',
  zip_code: '',
  city: '',
  place_id: '',
  works_at_place: true,
  can_travel: false,
})

const { isDirty, isSaving, reset, discard } = useDirtyForm(state, {
  message: t('common.unsavedChangesConfirm'),
})

// Tracks vue-tel-input validity for the phone field. Seeded from whether the
// loaded profile already has a phone (vue-tel may not emit validate on load).
const phoneValid = ref(false)

function seed(profile: MasterProfile) {
  state.value = {
    phone: profile.phone ?? '',
    whatsapp: profile.whatsapp ?? '',
    telegram: profile.telegram ?? '',
    instagram: profile.instagram ?? '',
    tiktok: profile.tiktok ?? '',
    contact_email: profile.contact_email ?? '',
    country: profile.country ?? '',
    address: profile.address ?? '',
    house_number: profile.house_number ?? '',
    zip_code: profile.zip_code ?? '',
    city: profile.city ?? '',
    place_id: profile.place_id ?? '',
    works_at_place: profile.works_at_place ?? true,
    can_travel: profile.can_travel ?? false,
  }
  phoneValid.value = (profile.phone ?? '').length > 0
  reset()
}

watch(
  profileData,
  (profile) => {
    if (!profile || isDirty.value) return
    seed(profile)
  },
  { immediate: true },
)

function onPhoneValidate(obj: { valid: boolean }) {
  phoneValid.value = obj.valid
}

function useMainNumber() {
  state.value.whatsapp = state.value.phone
}

// --- Address autocomplete -----------------------------------------------------
function handleAddressField(payload: IGoogleAutocompleteItem) {
  if (!payload.name && !payload.address_components?.length) {
    state.value.address = ''
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

  state.value.address = street?.long_name ?? state.value.address
  state.value.house_number = streetNumber?.long_name ?? ''
  state.value.city = city?.long_name ?? ''
  state.value.zip_code = postalCode?.long_name ?? ''
  state.value.place_id = payload.place_id
}

const addressRestrictions = computed(() =>
  state.value.country ? { country: state.value.country.toLowerCase() } : undefined,
)

// --- Validation ---------------------------------------------------------------
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isEmailValid = computed(() => {
  const value = state.value.contact_email.trim()
  return value.length === 0 || EMAIL_PATTERN.test(value)
})

const emailError = computed(() =>
  isDirty.value && !isEmailValid.value ? t('settings.contacts.emailInvalid') : undefined,
)

// Phone is NOT NULL in the DB — a valid number is required to save.
const isPhoneValid = computed(() => phoneValid.value && state.value.phone.trim().length > 0)

const canSave = computed(() => isDirty.value && isPhoneValid.value && isEmailValid.value)

// --- Actions ------------------------------------------------------------------
function orNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

async function onSave() {
  if (!canSave.value) return
  isSaving.value = true
  try {
    await updateMutation.mutateAsync({
      phone: state.value.phone.trim(),
      whatsapp: orNull(state.value.whatsapp),
      telegram: orNull(state.value.telegram),
      instagram: orNull(state.value.instagram),
      tiktok: orNull(state.value.tiktok),
      contact_email: orNull(state.value.contact_email),
      country: state.value.country,
      address: orNull(state.value.address),
      house_number: orNull(state.value.house_number),
      zip_code: orNull(state.value.zip_code),
      city: orNull(state.value.city),
      place_id: orNull(state.value.place_id),
      works_at_place: state.value.works_at_place,
      can_travel: state.value.can_travel,
    })
    reset()
    toast.add({ title: t('settings.contacts.saveSuccess'), color: 'success' })
  } catch {
    toast.add({ title: t('settings.contacts.saveError'), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

function onDiscard() {
  discard()
}

const hostUI = {
  root: 'rounded-xl shadow-panel ring-0 divide-y-0',
  header: 'pb-0',
}
</script>

<template>
  <UCard :ui="hostUI">
    <template #header>
      <div class="flex flex-col gap-1">
        <Typography variant="h5" class="text-highlighted font-bold">
          {{ t('settings.contacts.title') }}
        </Typography>
        <Typography variant="caption" class="text-muted">
          {{ t('settings.contacts.subtitle') }}
        </Typography>
      </div>
    </template>

    <div class="flex flex-col gap-6">
      <!-- Phone -->
      <UFormField :label="t('settings.contacts.phone')">
        <vue-tel-input
          v-model="state.phone"
          mode="international"
          :input-options="{
            placeholder: t('settings.contacts.phonePlaceholder'),
            showDialCode: true,
          }"
          @validate="onPhoneValidate"
        />
      </UFormField>

      <!-- WhatsApp -->
      <UFormField :label="t('settings.contacts.whatsapp')">
        <div class="flex items-center gap-2">
          <UInput
            v-model="state.whatsapp"
            leading-icon="i-lucide-message-circle"
            :placeholder="t('settings.contacts.whatsappPlaceholder')"
            class="flex-1"
          />
          <UButton
            size="sm"
            color="neutral"
            variant="outline"
            leading-icon="i-lucide-copy"
            @click="useMainNumber"
          >
            {{ t('settings.contacts.whatsappUseMain') }}
          </UButton>
        </div>
      </UFormField>

      <!-- Telegram -->
      <UFormField :label="t('settings.contacts.telegram')">
        <UInput
          v-model="state.telegram"
          leading-icon="i-lucide-send"
          :placeholder="t('settings.contacts.telegramPlaceholder')"
          class="w-full"
        />
      </UFormField>

      <!-- Instagram -->
      <UFormField :label="t('settings.contacts.instagram')">
        <UInput
          v-model="state.instagram"
          leading-icon="i-lucide-at-sign"
          :placeholder="t('settings.contacts.instagramPlaceholder')"
          class="w-full"
        />
      </UFormField>

      <!-- TikTok -->
      <UFormField :label="t('settings.contacts.tiktok')">
        <UInput
          v-model="state.tiktok"
          leading-icon="i-lucide-music"
          :placeholder="t('settings.contacts.tiktokPlaceholder')"
          class="w-full"
        />
      </UFormField>

      <!-- Email -->
      <UFormField :label="t('settings.contacts.email')" :error="emailError">
        <UInput
          v-model="state.contact_email"
          type="email"
          leading-icon="i-lucide-mail"
          :placeholder="t('settings.contacts.emailPlaceholder')"
          class="w-full"
        />
      </UFormField>

      <!-- Studio / address -->
      <div class="flex flex-col gap-4 border-t border-default pt-6">
        <div class="flex flex-col gap-1">
          <Typography variant="h6" class="text-highlighted font-semibold">
            {{ t('settings.contacts.address.title') }}
          </Typography>
          <Typography variant="caption" class="text-muted">
            {{ t('settings.contacts.address.subtitle') }}
          </Typography>
        </div>

        <UFormField :label="t('settings.contacts.address.country')">
          <USelectMenu
            v-model="state.country"
            :items="COUNTRIES"
            value-key="value"
            :placeholder="t('settings.contacts.address.countryPlaceholder')"
            searchable
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-3 gap-3">
          <UFormField
            :label="t('settings.contacts.address.street')"
            class="col-span-2"
          >
            <AddressAutocomplete
              v-model="state.address"
              :placeholder="t('settings.contacts.address.streetPlaceholder')"
              :component-restrictions="addressRestrictions"
              class="w-full"
              @place-changed="handleAddressField"
            />
          </UFormField>
          <UFormField :label="t('settings.contacts.address.houseNumber')">
            <UInput
              v-model="state.house_number"
              :placeholder="t('settings.contacts.address.houseNumberPlaceholder')"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <UFormField :label="t('settings.contacts.address.zipCode')">
            <UInput
              v-model="state.zip_code"
              :placeholder="t('settings.contacts.address.zipCodePlaceholder')"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('settings.contacts.address.city')" class="col-span-2">
            <UInput
              v-model="state.city"
              :placeholder="t('settings.contacts.address.cityPlaceholder')"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="flex flex-col gap-3 pt-1">
          <USwitch
            v-model="state.works_at_place"
            :label="t('settings.contacts.address.worksAtPlace')"
          />
          <USwitch v-model="state.can_travel" :label="t('settings.contacts.address.canTravel')" />
        </div>
      </div>
    </div>

    <FormSaveBar :dirty="canSave" :saving="isSaving" @save="onSave" @discard="onDiscard" />
  </UCard>
</template>
