<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonTitle,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonInput,
  IonLabel,
  IonNote,
  IonIcon,
  IonToggle,
  IonSpinner,
  toastController,
} from '@ionic/vue'
import {
  logoWhatsapp,
  logoInstagram,
  logoTiktok,
  paperPlaneOutline,
  mailOutline,
  copyOutline,
} from 'ionicons/icons'
import { useSessionStore } from '@entities/session'
import { useMasterProfileQuery, useUpdateMasterContactsMutation } from '@entities/master'
import type { MasterProfile } from '@entities/master'
import { useDirtyForm } from '@shared/lib/forms'
import { COUNTRIES } from '@shared/lib/countries'
import { ListPickerModal } from '@shared/ui/list-picker-modal/index.mobile'

// Native Ionic port of the desktop ContactsForm (features/contacts-form). Kept
// as a single page component — like SettingsProfilePage — because it's a one-off
// screen driven by a toolbar "Done" button. Data layer, i18n keys and validation
// rules are shared with the desktop form. The one deliberate simplification: the
// street field is a plain input rather than the Google-places autocomplete, which
// pulls Nuxt UI and can't live in the mobile bundle.
const { t } = useI18n()
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

const { isDirty, isSaving, reset } = useDirtyForm(state, {
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

// Offer the shortcut only when there's a main number to copy and it isn't
// already mirrored into the WhatsApp field.
const canUseMainNumber = computed(
  () =>
    state.value.phone.trim().length > 0 && state.value.whatsapp.trim() !== state.value.phone.trim(),
)

function useMainNumber() {
  state.value.whatsapp = state.value.phone
}

// --- Country picker (iOS card modal) ------------------------------------------
const isCountryModalOpen = ref(false)
const currentCountryLabel = computed(
  () => COUNTRIES.find((c) => c.value === state.value.country)?.label ?? '',
)
function onCountrySelected(value: string | number) {
  state.value.country = String(value)
}

// The tab's router outlet is the "presenting element" that makes the modal
// animate as an iOS card over the page rather than full-screen.
const presentingElement = ref<HTMLElement | null>(null)
onMounted(() => {
  presentingElement.value = document.querySelector('ion-router-outlet')
})

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

async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2000, color, position: 'top' })
  await toast.present()
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
    await showToast(t('settings.contacts.saveSuccess'), 'success')
  } catch {
    await showToast(t('settings.contacts.saveError'), 'danger')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/settings" />
        </ion-buttons>
        <ion-title>{{ $t('settings.contacts.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button strong :disabled="!canSave || isSaving" @click="onSave">
            <ion-spinner v-if="isSaving" name="crescent" />
            <span v-else>{{ $t('common.done') }}</span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-note class="intro-note">{{ $t('settings.contacts.subtitle') }}</ion-note>

      <!-- Phone -->
      <ion-list inset>
        <ion-item lines="none">
          <ion-label position="stacked">{{ $t('settings.contacts.phone') }}</ion-label>
          <vue-tel-input
            v-model="state.phone"
            class="se-phone"
            mode="international"
            :input-options="{
              placeholder: $t('settings.contacts.phonePlaceholder'),
              showDialCode: true,
            }"
            @validate="onPhoneValidate"
          />
        </ion-item>
      </ion-list>

      <!-- Social channels -->
      <ion-list inset>
        <ion-item>
          <ion-icon slot="start" :icon="logoWhatsapp" aria-hidden="true" />
          <ion-input
            v-model="state.whatsapp"
            label-placement="stacked"
            :label="$t('settings.contacts.whatsapp')"
            :placeholder="$t('settings.contacts.whatsappPlaceholder')"
            inputmode="tel"
            autocapitalize="off"
          />
        </ion-item>
        <ion-item v-if="canUseMainNumber" lines="none">
          <ion-button fill="clear" size="small" class="use-main" @click="useMainNumber">
            <ion-icon slot="start" :icon="copyOutline" aria-hidden="true" />
            {{ $t('settings.contacts.whatsappUseMain') }}
          </ion-button>
        </ion-item>

        <ion-item>
          <ion-icon slot="start" :icon="paperPlaneOutline" aria-hidden="true" />
          <ion-input
            v-model="state.telegram"
            label-placement="stacked"
            :label="$t('settings.contacts.telegram')"
            :placeholder="$t('settings.contacts.telegramPlaceholder')"
            autocapitalize="off"
            :spellcheck="false"
          />
        </ion-item>

        <ion-item>
          <ion-icon slot="start" :icon="logoInstagram" aria-hidden="true" />
          <ion-input
            v-model="state.instagram"
            label-placement="stacked"
            :label="$t('settings.contacts.instagram')"
            :placeholder="$t('settings.contacts.instagramPlaceholder')"
            autocapitalize="off"
            :spellcheck="false"
          />
        </ion-item>

        <ion-item lines="none">
          <ion-icon slot="start" :icon="logoTiktok" aria-hidden="true" />
          <ion-input
            v-model="state.tiktok"
            label-placement="stacked"
            :label="$t('settings.contacts.tiktok')"
            :placeholder="$t('settings.contacts.tiktokPlaceholder')"
            autocapitalize="off"
            :spellcheck="false"
          />
        </ion-item>
      </ion-list>

      <!-- Email -->
      <ion-list inset>
        <ion-item lines="none">
          <ion-icon slot="start" :icon="mailOutline" aria-hidden="true" />
          <ion-input
            v-model="state.contact_email"
            type="email"
            inputmode="email"
            autocapitalize="off"
            label-placement="stacked"
            :label="$t('settings.contacts.email')"
            :placeholder="$t('settings.contacts.emailPlaceholder')"
            :class="{ 'ion-invalid': emailError, 'ion-touched': isDirty }"
            :error-text="emailError"
          />
        </ion-item>
      </ion-list>

      <!-- Studio / address -->
      <ion-list inset>
        <ion-list-header>
          <ion-label>{{ $t('settings.contacts.address.title') }}</ion-label>
        </ion-list-header>
        <ion-note class="section-note">{{ $t('settings.contacts.address.subtitle') }}</ion-note>

        <ion-item button detail @click="isCountryModalOpen = true">
          <ion-label>
            <p>{{ $t('settings.contacts.address.country') }}</p>
            <h3 v-if="currentCountryLabel">{{ currentCountryLabel }}</h3>
            <h3 v-else class="placeholder">
              {{ $t('settings.contacts.address.countryPlaceholder') }}
            </h3>
          </ion-label>
        </ion-item>

        <ion-item>
          <ion-input
            v-model="state.address"
            label-placement="stacked"
            :label="$t('settings.contacts.address.street')"
            :placeholder="$t('settings.contacts.address.streetPlaceholder')"
          />
        </ion-item>
        <ion-item>
          <ion-input
            v-model="state.house_number"
            label-placement="stacked"
            :label="$t('settings.contacts.address.houseNumber')"
            :placeholder="$t('settings.contacts.address.houseNumberPlaceholder')"
          />
        </ion-item>
        <ion-item>
          <ion-input
            v-model="state.zip_code"
            label-placement="stacked"
            :label="$t('settings.contacts.address.zipCode')"
            :placeholder="$t('settings.contacts.address.zipCodePlaceholder')"
            inputmode="numeric"
          />
        </ion-item>
        <ion-item lines="none">
          <ion-input
            v-model="state.city"
            label-placement="stacked"
            :label="$t('settings.contacts.address.city')"
            :placeholder="$t('settings.contacts.address.cityPlaceholder')"
          />
        </ion-item>
      </ion-list>

      <!-- Availability -->
      <ion-list inset>
        <ion-item>
          <ion-toggle v-model="state.works_at_place">
            {{ $t('settings.contacts.address.worksAtPlace') }}
          </ion-toggle>
        </ion-item>
        <ion-item lines="none">
          <ion-toggle v-model="state.can_travel">
            {{ $t('settings.contacts.address.canTravel') }}
          </ion-toggle>
        </ion-item>
      </ion-list>

      <!-- Country picker (iOS card modal) -->
      <list-picker-modal
        v-model:is-open="isCountryModalOpen"
        :title="$t('settings.contacts.address.country')"
        :items="COUNTRIES"
        :model-value="state.country"
        searchable
        :presenting-element="presentingElement"
        @update:model-value="onCountrySelected"
      />
    </ion-content>
  </ion-page>
</template>

<style scoped>
.intro-note,
.section-note {
  display: block;
  padding-inline: 16px;
  padding-bottom: 8px;
  font-size: 0.8rem;
}

.intro-note {
  padding-top: 8px;
}

.placeholder {
  color: var(--ion-color-medium, #92949c);
}

.use-main {
  margin-inline-start: -8px;
}

/* vue-tel-input is a light-DOM component, so it needs to be nudged to match the
   Ionic list item it sits inside. */
.se-phone {
  width: 100%;
  margin-top: 6px;
  border-radius: 8px;
  --vti-border-radius: 8px;
}
</style>
