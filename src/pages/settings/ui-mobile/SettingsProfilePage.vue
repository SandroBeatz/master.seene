<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { watchDebounced } from '@vueuse/core'
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
  IonTextarea,
  IonLabel,
  IonNote,
  IonIcon,
  IonAvatar,
  IonSpinner,
  isPlatform,
  actionSheetController,
  toastController,
  type ActionSheetButton,
} from '@ionic/vue'
import {
  personOutline,
  checkmark,
  pencilOutline,
  linkOutline,
  eyeOutline,
  copyOutline,
  shareSocialOutline,
  qrCodeOutline,
  checkmarkCircle,
  closeCircle,
  arrowBackOutline,
  arrowUndoOutline,
} from 'ionicons/icons'
import { useSessionStore } from '@entities/session'
import {
  isUsernameAvailable,
  useMasterProfileQuery,
  useRemoveMasterAvatarMutation,
  useUpdateMasterProfileMutation,
  useUploadMasterAvatarMutation,
} from '@entities/master'
import type { MasterProfile } from '@entities/master'
import { SPECIALIZATION_CODES } from '@features/profile-form/index.mobile'
import { resizeImageToSquare } from '@shared/lib/image'
import { useDirtyForm } from '@shared/lib/forms'
import { bookingPageUrl } from '@shared/config'
import { InsetList } from '@shared/ui/inset-list/index.mobile'

// Native Ionic port of the desktop ProfileForm (features/profile-form). Kept as
// a single page component because it's a one-off screen driven by a toolbar
// "Done" button — no reuse that would justify splitting into a feature slice.
// Data layer, i18n keys and validation rules are shared with the desktop form.
//
// The mobile form collapses first_name + last_name into a single "Full name"
// field: those columns stay in the DB (split on save, joined on load) but aren't
// surfaced separately here.
const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: profileData } = useMasterProfileQuery(userId)
const updateMutation = useUpdateMasterProfileMutation(userId)
const uploadAvatarMutation = useUploadMasterAvatarMutation(userId)
const removeAvatarMutation = useRemoveMasterAvatarMutation(userId)

interface ProfileFormState {
  full_name: string
  username: string
  specializations: string[]
  bio: string
}

const state = ref<ProfileFormState>({
  full_name: '',
  username: '',
  specializations: [],
  bio: '',
})

const { isDirty, isSaving, reset, discard } = useDirtyForm(state, {
  message: t('common.unsavedChangesConfirm'),
})

// The username the profile was loaded with — counts as "available".
const loadedUsername = ref('')

function seed(profile: MasterProfile) {
  state.value = {
    // Join the stored name columns back into one editable field.
    full_name: [profile.first_name, profile.last_name].filter(Boolean).join(' '),
    username: profile.username ?? '',
    // Normalize to canonical order so chip toggles don't create false diffs.
    specializations: SPECIALIZATION_CODES.filter((code) =>
      (profile.specializations ?? []).includes(code),
    ),
    bio: profile.bio ?? '',
  }
  loadedUsername.value = profile.username ?? ''
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

async function showToast(message: string, color: 'success' | 'danger' | 'medium' = 'success') {
  const toast = await toastController.create({ message, duration: 2000, color, position: 'top' })
  await toast.present()
}

// --- Avatar (eager: persists immediately, outside the dirty-form Save flow) ----
const ACCEPTED_AVATAR_TYPES = ['image/png', 'image/jpeg']
const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5 MB

const fileInput = ref<HTMLInputElement | null>(null)
const previewUrl = ref<string | null>(null)

const avatarSrc = computed(() => previewUrl.value ?? profileData.value?.avatar_url ?? undefined)
const hasAvatar = computed(() => Boolean(previewUrl.value ?? profileData.value?.avatar_url))
const isAvatarBusy = computed(
  () => uploadAvatarMutation.isLoading.value || removeAvatarMutation.isLoading.value,
)

function pickAvatar() {
  fileInput.value?.click()
}

// Tapping the avatar's edit badge opens a bottom action sheet — "Change photo"
// always, plus a destructive "Remove" once an avatar exists.
async function openAvatarMenu() {
  const buttons: ActionSheetButton[] = [
    { text: t('settings.profile.avatar.change'), handler: pickAvatar },
    ...(hasAvatar.value
      ? [{ text: t('settings.profile.avatar.remove'), role: 'destructive', handler: removeAvatar }]
      : []),
    { text: t('common.cancel'), role: 'cancel' },
  ]
  const sheet = await actionSheetController.create({ buttons })
  await sheet.present()
}

function clearFileInput() {
  if (fileInput.value) fileInput.value.value = ''
}

function setPreview(url: string | null) {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = url
}

async function onAvatarSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
    await showToast(t('settings.profile.avatar.invalidType'), 'danger')
    clearFileInput()
    return
  }
  if (file.size > MAX_AVATAR_BYTES) {
    await showToast(t('settings.profile.avatar.tooLarge'), 'danger')
    clearFileInput()
    return
  }

  try {
    const blob = await resizeImageToSquare(file, 512)
    setPreview(URL.createObjectURL(blob))
    await uploadAvatarMutation.mutateAsync(blob)
    // Keep the session profile (avatar shown across the app) in sync.
    await sessionStore.refreshProfile()
    await showToast(t('settings.profile.avatar.uploadSuccess'), 'success')
  } catch {
    setPreview(null)
    await showToast(t('settings.profile.avatar.uploadError'), 'danger')
  } finally {
    clearFileInput()
  }
}

async function removeAvatar() {
  try {
    await removeAvatarMutation.mutateAsync()
    setPreview(null)
    await sessionStore.refreshProfile()
    await showToast(t('settings.profile.avatar.removeSuccess'), 'success')
  } catch {
    await showToast(t('settings.profile.avatar.removeError'), 'danger')
  } finally {
    clearFileInput()
  }
}

onBeforeUnmount(() => setPreview(null))

// --- Specializations ----------------------------------------------------------
function toggleSpecialization(code: string) {
  const selected = new Set(state.value.specializations)
  if (selected.has(code)) selected.delete(code)
  else selected.add(code)
  state.value.specializations = SPECIALIZATION_CODES.filter((c) => selected.has(c))
}

function isSpecializationSelected(code: string) {
  return state.value.specializations.includes(code)
}

// --- Username availability -----------------------------------------------------
const USERNAME_PATTERN = /^[a-z0-9._-]+$/
type UsernameStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken'
const usernameStatus = ref<UsernameStatus>('idle')

watchDebounced(
  () => state.value.username,
  async (value) => {
    const normalized = value.trim().toLowerCase()
    if (!normalized || normalized === loadedUsername.value) {
      usernameStatus.value = 'idle'
      return
    }
    if (!USERNAME_PATTERN.test(normalized)) {
      usernameStatus.value = 'invalid'
      return
    }
    usernameStatus.value = 'checking'
    try {
      const available = await isUsernameAvailable(normalized, userId.value)
      usernameStatus.value = available ? 'available' : 'taken'
    } catch {
      usernameStatus.value = 'idle'
    }
  },
  { debounce: 400 },
)

const publicUrl = computed(() => bookingPageUrl(state.value.username || loadedUsername.value))

// --- Required-field validation ------------------------------------------------
// Errors only surface once the form is dirty, so a freshly-loaded profile
// doesn't greet the user with a wall of red.
const isFullNameFilled = computed(() => state.value.full_name.trim().length > 0)
const isUsernameFilled = computed(() => state.value.username.trim().length > 0)
const hasSpecialization = computed(() => state.value.specializations.length > 0)

const requiredMsg = computed(() => t('settings.profile.requiredField'))

const fullNameError = computed(() =>
  isDirty.value && !isFullNameFilled.value ? requiredMsg.value : undefined,
)
const specializationError = computed(() =>
  isDirty.value && !hasSpecialization.value
    ? t('settings.profile.specializationRequired')
    : undefined,
)
const usernameError = computed(() => {
  if (usernameStatus.value === 'invalid') return t('settings.profile.usernameInvalid')
  if (usernameStatus.value === 'taken') return t('settings.profile.usernameTaken')
  if (isDirty.value && !isUsernameFilled.value) return requiredMsg.value
  return undefined
})

const isFormValid = computed(
  () =>
    isFullNameFilled.value &&
    isUsernameFilled.value &&
    hasSpecialization.value &&
    usernameStatus.value !== 'taken' &&
    usernameStatus.value !== 'invalid',
)

const canSave = computed(() => isDirty.value && isFormValid.value)
const saveSpinnerName = isPlatform('ios') ? 'dots' : 'crescent'

// --- Actions ------------------------------------------------------------------
async function onSave() {
  if (!canSave.value) return
  isSaving.value = true
  try {
    // Split the single "Full name" field back into the two stored columns:
    // first token → first_name, the remainder → last_name.
    const parts = state.value.full_name.trim().replace(/\s+/g, ' ').split(' ')
    const first_name = parts.shift() ?? ''
    const last_name = parts.join(' ')
    await updateMutation.mutateAsync({
      first_name,
      last_name,
      username: state.value.username.trim().toLowerCase(),
      specializations: state.value.specializations,
      bio: state.value.bio.trim() || null,
    })
    loadedUsername.value = state.value.username.trim().toLowerCase()
    usernameStatus.value = 'idle'
    reset()
    // Keep the dashboard header name in sync (session reads master_profile).
    await sessionStore.refreshProfile()
    await showToast(t('settings.profile.saveSuccess'), 'success')
  } catch {
    await showToast(t('settings.profile.saveError'), 'danger')
  } finally {
    isSaving.value = false
  }
}

// Reverts every field back to the last loaded/saved snapshot.
function onDiscard() {
  discard()
  usernameStatus.value = 'idle'
}

async function copyLink() {
  await navigator.clipboard.writeText(publicUrl.value)
  await showToast(t('settings.profile.linkCopied'), 'success')
}

function openPage() {
  window.open(publicUrl.value, '_blank', 'noopener')
}

// Share sheet + QR code are not wired up yet — stubbed with a "coming soon" hint.
async function comingSoon() {
  await showToast(t('common.comingSoon'), 'medium')
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
        <ion-title>{{ $t('settings.profile.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding-bottom">
      <!-- Avatar -->
      <section class="avatar-section">
        <div class="avatar-picker">
          <ion-avatar class="profile-avatar">
            <img v-if="avatarSrc" :src="avatarSrc" :alt="$t('settings.profile.title')" />
            <ion-icon v-else :icon="personOutline" aria-hidden="true" />
          </ion-avatar>
          <ion-button
            class="avatar-edit-button"
            fill="solid"
            shape="round"
            :disabled="isAvatarBusy"
            :aria-label="$t('settings.profile.avatar.change')"
            @click="openAvatarMenu"
          >
            <ion-spinner v-if="isAvatarBusy" :name="saveSpinnerName" />
            <ion-icon v-else slot="icon-only" :icon="pencilOutline" aria-hidden="true" />
          </ion-button>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/png,image/jpeg"
          class="hidden-file-input"
          @change="onAvatarSelected"
        />
      </section>

      <!-- Identity card: full name, username, bio -->
      <inset-list>
        <ion-item :class="{ 'ion-invalid': fullNameError, 'ion-touched': isDirty }">
          <ion-label class="field-label">{{ $t('settings.profile.fullName') }}</ion-label>
          <ion-input
            v-model="state.full_name"
            class="value-input"
            :placeholder="$t('settings.profile.fullNamePlaceholder')"
            autocapitalize="words"
            enterkeyhint="next"
          />
        </ion-item>

        <ion-item :class="{ 'ion-invalid': usernameError, 'ion-touched': isDirty }" lines="none">
          <ion-label class="field-label">{{ $t('settings.profile.username') }}</ion-label>
          <ion-input
            v-model="state.username"
            class="value-input"
            autocapitalize="off"
            autocomplete="off"
            :spellcheck="false"
            placeholder="username"
          />
          <ion-spinner v-if="usernameStatus === 'checking'" slot="end" name="dots" />
          <ion-icon
            v-else-if="usernameStatus === 'available'"
            slot="end"
            :icon="checkmarkCircle"
            color="success"
            aria-hidden="true"
          />
          <ion-icon
            v-else-if="usernameStatus === 'taken'"
            slot="end"
            :icon="closeCircle"
            color="danger"
            aria-hidden="true"
          />
        </ion-item>
      </inset-list>

      <!-- Inline validation for the identity card -->
      <ion-note v-if="fullNameError" color="danger" class="field-hint">{{
        fullNameError
      }}</ion-note>
      <ion-note v-if="usernameError" color="danger" class="field-hint">{{
        usernameError
      }}</ion-note>

      <!-- Bio -->
      <inset-list :header="$t('settings.profile.bio')">
        <ion-item>
          <ion-textarea
            v-model="state.bio"
            :placeholder="$t('settings.profile.bioPlaceholder')"
            :auto-grow="true"
            :rows="3"
            :maxlength="500"
            :counter="true"
          />
        </ion-item>
      </inset-list>

      <!-- Specialization -->
      <inset-list :header="$t('settings.profile.specialization')">
        <div class="chips">
          <button
            v-for="code in SPECIALIZATION_CODES"
            :key="code"
            type="button"
            class="chip"
            :class="{ 'chip--selected': isSpecializationSelected(code) }"
            @click="toggleSpecialization(code)"
          >
            <ion-icon v-if="isSpecializationSelected(code)" :icon="checkmark" aria-hidden="true" />
            {{ $t(`onboarding.step1.categories.${code}`) }}
          </button>
        </div>
      </inset-list>
      <ion-note v-if="specializationError" color="danger" class="field-hint">
        {{ specializationError }}
      </ion-note>

      <!-- Public booking page: formed link + quick actions -->
      <inset-list :header="$t('settings.profile.yourPage')">
        <ion-item lines="none" class="link-item">
          <ion-icon slot="start" :icon="linkOutline" aria-hidden="true" />
          <ion-label class="link-text">{{ publicUrl }}</ion-label>
        </ion-item>
      </inset-list>

      <div class="action-grid">
        <button type="button" class="action-btn" @click="openPage">
          <ion-icon :icon="eyeOutline" aria-hidden="true" />
          <span>{{ $t('settings.profile.view') }}</span>
        </button>
        <button type="button" class="action-btn" @click="copyLink">
          <ion-icon :icon="copyOutline" aria-hidden="true" />
          <span>{{ $t('settings.profile.copy') }}</span>
        </button>
        <button type="button" class="action-btn" @click="comingSoon">
          <ion-icon :icon="shareSocialOutline" aria-hidden="true" />
          <span>{{ $t('settings.profile.share') }}</span>
        </button>
        <button type="button" class="action-btn" @click="comingSoon">
          <ion-icon :icon="qrCodeOutline" aria-hidden="true" />
          <span>{{ $t('settings.profile.qrCode') }}</span>
        </button>
      </div>
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

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px 24px;
}

.avatar-picker {
  position: relative;
  width: 128px;
  height: 128px;
}

.profile-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 128px;
  height: 128px;
  background: var(--se-surface-card, #f4f5f8);
}

.profile-avatar ion-icon {
  font-size: 52px;
  color: var(--ion-color-medium, #92949c);
}

.avatar-edit-button {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 34px;
  height: 34px;
  margin: 0;
  --border-radius: 50%;
  --box-shadow: 0 0 0 3px var(--se-surface-page), 0 2px 8px rgb(0 0 0 / 20%);
  --padding-start: 0;
  --padding-end: 0;
}

.avatar-edit-button ion-icon {
  font-size: 15px;
}

/* Identity card rows: label on the left, value right-aligned (native input
   inherits text-align from the ion-input host). */
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

.field-hint {
  display: block;
  margin-top: -14px;
  margin-bottom: 22px;
  padding-inline: 32px;
  font-size: 0.75rem;
}

/* Specialization chips — explicit backgrounds so they render on iOS too
   (ion-chip[outline] draws no fill on the iOS palette). */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px 14px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 7px 14px;
  border: none;
  border-radius: 999px;
  background: var(--ion-background-color-step-100, #f2f2f7);
  color: var(--ion-color-medium, #8c8c8c);
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.chip ion-icon {
  font-size: 15px;
}

.chip--selected {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}

.chip:active {
  opacity: 0.75;
}

/* Public page link row */
.link-item {
  --min-height: 52px;
}

.link-text {
  overflow-wrap: anywhere;
  color: var(--ion-color-primary);
  font-size: 0.875rem;
}

/* Four quick actions, icon stacked over label */
.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding: 0 16px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 4px;
  border: none;
  border-radius: 12px;
  background: var(--se-surface-card, #fff);
  color: var(--ion-color-primary);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
}

.action-btn ion-icon {
  font-size: 24px;
}

.action-btn:active {
  opacity: 0.6;
}

.hidden-file-input {
  display: none;
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
