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
  IonFooter,
  IonItem,
  IonInput,
  IonLabel,
  IonNote,
  IonIcon,
  IonToggle,
  IonSpinner,
  isPlatform,
  toastController,
} from '@ionic/vue'
import {
  logoWhatsapp,
  logoInstagram,
  logoTiktok,
  paperPlaneOutline,
  mailOutline,
  copyOutline,
  arrowBackOutline,
  arrowUndoOutline,
} from 'ionicons/icons'
import { useSessionStore } from '@entities/session'
import { useMasterProfileQuery, useUpdateMasterContactsMutation } from '@entities/master'
import type { MasterProfile } from '@entities/master'
import { useDirtyForm } from '@shared/lib/forms'
import { COUNTRIES } from '@shared/lib/countries'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import { ListPickerModal } from '@shared/ui/list-picker-modal/index.mobile'

// Native Ionic port of the desktop ContactsForm (features/contacts-form). Kept
// as a single page component — like SettingsProfilePage — because it's a one-off
// screen driven by a footer "Save" bar. Data layer, i18n keys and validation
// rules are shared with the desktop form. The one deliberate simplification: the
// street field is a plain input rather than the Google-places autocomplete, which
// pulls Nuxt UI and can't live in the mobile bundle.
//
// Structure/styling mirrors SettingsProfilePage: inset-grouped cards, iOS-style
// label-left / value-right rows, and a save bar that only slides in once dirty.
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
const saveSpinnerName = isPlatform('ios') ? 'dots' : 'crescent'

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

// Reverts every field back to the last loaded/saved snapshot, then re-derives
// phone validity from the restored value (vue-tel doesn't re-validate on reset).
function onDiscard() {
  discard()
  phoneValid.value = state.value.phone.trim().length > 0
}
</script>

<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button
            default-href="/tabs/settings"
            text=""
            :icon="arrowBackOutline"
            color="dark"
          />
        </ion-buttons>
        <ion-title>{{ $t('settings.contacts.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding-bottom">
      <p class="intro-note">{{ $t('settings.contacts.subtitle') }}</p>

      <!-- Phone (label supplied by the section header) -->
      <inset-list :header="$t('settings.contacts.phone')">
        <ion-item lines="none">
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
      </inset-list>

      <!-- Reachable channels: social handles + email -->
      <inset-list>
        <ion-item>
          <ion-icon slot="start" :icon="logoWhatsapp" aria-hidden="true" />
          <ion-label class="field-label">{{ $t('settings.contacts.whatsapp') }}</ion-label>
          <ion-input
            v-model="state.whatsapp"
            class="value-input"
            :placeholder="$t('settings.contacts.whatsappPlaceholder')"
            inputmode="tel"
            autocapitalize="off"
          />
        </ion-item>
        <ion-item v-if="canUseMainNumber">
          <ion-button fill="clear" size="small" class="use-main" @click="useMainNumber">
            <ion-icon slot="start" :icon="copyOutline" aria-hidden="true" />
            {{ $t('settings.contacts.whatsappUseMain') }}
          </ion-button>
        </ion-item>

        <ion-item>
          <ion-icon slot="start" :icon="paperPlaneOutline" aria-hidden="true" />
          <ion-label class="field-label">{{ $t('settings.contacts.telegram') }}</ion-label>
          <ion-input
            v-model="state.telegram"
            class="value-input"
            :placeholder="$t('settings.contacts.telegramPlaceholder')"
            autocapitalize="off"
            :spellcheck="false"
          />
        </ion-item>

        <ion-item>
          <ion-icon slot="start" :icon="logoInstagram" aria-hidden="true" />
          <ion-label class="field-label">{{ $t('settings.contacts.instagram') }}</ion-label>
          <ion-input
            v-model="state.instagram"
            class="value-input"
            :placeholder="$t('settings.contacts.instagramPlaceholder')"
            autocapitalize="off"
            :spellcheck="false"
          />
        </ion-item>

        <ion-item>
          <ion-icon slot="start" :icon="logoTiktok" aria-hidden="true" />
          <ion-label class="field-label">{{ $t('settings.contacts.tiktok') }}</ion-label>
          <ion-input
            v-model="state.tiktok"
            class="value-input"
            :placeholder="$t('settings.contacts.tiktokPlaceholder')"
            autocapitalize="off"
            :spellcheck="false"
          />
        </ion-item>

        <ion-item :class="{ 'ion-invalid': emailError, 'ion-touched': isDirty }" lines="none">
          <ion-icon slot="start" :icon="mailOutline" aria-hidden="true" />
          <ion-label class="field-label">{{ $t('settings.contacts.email') }}</ion-label>
          <ion-input
            v-model="state.contact_email"
            class="value-input"
            type="email"
            inputmode="email"
            autocapitalize="off"
            :placeholder="$t('settings.contacts.emailPlaceholder')"
          />
        </ion-item>
      </inset-list>
      <ion-note v-if="emailError" color="danger" class="field-hint">{{ emailError }}</ion-note>

      <!-- Studio / address -->
      <inset-list>
        <template #header>
          {{ $t('settings.contacts.address.title') }}
          <span class="header-note">{{ $t('settings.contacts.address.subtitle') }}</span>
        </template>

        <ion-item button detail @click="isCountryModalOpen = true">
          <ion-label class="field-label">{{ $t('settings.contacts.address.country') }}</ion-label>
          <ion-label slot="end" class="value-static" :class="{ placeholder: !currentCountryLabel }">
            {{ currentCountryLabel || $t('settings.contacts.address.countryPlaceholder') }}
          </ion-label>
        </ion-item>

        <ion-item>
          <ion-label class="field-label">{{ $t('settings.contacts.address.street') }}</ion-label>
          <ion-input
            v-model="state.address"
            class="value-input"
            :placeholder="$t('settings.contacts.address.streetPlaceholder')"
          />
        </ion-item>
        <ion-item>
          <ion-label class="field-label">{{ $t('settings.contacts.address.houseNumber') }}</ion-label>
          <ion-input
            v-model="state.house_number"
            class="value-input"
            :placeholder="$t('settings.contacts.address.houseNumberPlaceholder')"
          />
        </ion-item>
        <ion-item>
          <ion-label class="field-label">{{ $t('settings.contacts.address.zipCode') }}</ion-label>
          <ion-input
            v-model="state.zip_code"
            class="value-input"
            :placeholder="$t('settings.contacts.address.zipCodePlaceholder')"
            inputmode="numeric"
          />
        </ion-item>
        <ion-item lines="none">
          <ion-label class="field-label">{{ $t('settings.contacts.address.city') }}</ion-label>
          <ion-input
            v-model="state.city"
            class="value-input"
            :placeholder="$t('settings.contacts.address.cityPlaceholder')"
          />
        </ion-item>
      </inset-list>

      <!-- Availability -->
      <inset-list>
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
      </inset-list>

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

    <!-- Save bar: slides in only while the form has unsaved changes. Discard on
         the left reverts to the loaded values; Save commits them. -->
    <ion-footer v-if="isDirty" :translucent="true" class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start" class="ion-padding-end">
          <ion-button color="medium" :disabled="isSaving" @click="onDiscard">
            <ion-icon slot="icon-only" :ios="arrowUndoOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-button
          class="save-button"
          expand="block"
          :disabled="!canSave || isSaving"
          :aria-busy="isSaving"
          @click="onSave"
        >
          <span :class="{ 'save-button-label--hidden': isSaving }">
            {{ $t('common.saveChanges') }}
          </span>
          <ion-spinner v-if="isSaving" class="save-button-spinner" :name="saveSpinnerName" />
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<style scoped>
ion-header ion-toolbar.ios {
  --padding-start: 16px;
  --padding-end: 16px;
}

ion-header ion-toolbar {
  --background: var(--se-surface-page, #f2f2f7);
}

.intro-note {
  display: block;
  margin: 0;
  padding: 8px 16px 12px;
  color: var(--ion-color-medium);
  font-size: 0.8rem;
}

/* Section-header sub-line (rendered inside inset-list's header slot). */
.header-note {
  display: block;
  margin-top: 2px;
  font-weight: 400;
}

/* iOS Settings-style rows: label on the left, value right-aligned (native
   input inherits text-align from the ion-input host). Shared with the profile
   page's identity card. */
.field-label {
  flex: 0 0 auto;
  margin-inline-end: 12px;
  color: var(--ion-color-medium);
  font-size: 0.95rem;
  white-space: nowrap;
}

.value-input {
  flex: 1 1 auto;
  text-align: end;
  --color: var(--ion-text-color);
  --padding-end: 0;
  --placeholder-color: var(--ion-color-medium);
  --placeholder-opacity: 1;
}

/* Read-only value (country picker row) styled to match .value-input. */
.value-static {
  flex: 1 1 auto;
  text-align: end;
  color: var(--ion-text-color);
  font-size: 0.95rem;
}

.value-static.placeholder {
  color: var(--ion-color-medium);
}

.field-hint {
  display: block;
  margin-top: -14px;
  margin-bottom: 22px;
  padding-inline: 32px;
  font-size: 0.75rem;
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

ion-footer ion-toolbar {
  --padding-top: 16px;
  --padding-bottom: 16px;
}

ion-footer ion-toolbar.md {
  --padding-start: 16px;
  --padding-end: 16px;
}

.save-button {
  position: relative;
}

.save-button-label--hidden {
  opacity: 0;
}

.save-button-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
