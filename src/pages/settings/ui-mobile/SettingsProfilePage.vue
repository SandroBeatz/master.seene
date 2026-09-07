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
  IonList,
  IonListHeader,
  IonItem,
  IonInput,
  IonTextarea,
  IonLabel,
  IonNote,
  IonChip,
  IonIcon,
  IonAvatar,
  IonSpinner,
  toastController,
} from '@ionic/vue'
import {
  personOutline,
  checkmark,
  cloudUploadOutline,
  trashOutline,
  openOutline,
  linkOutline,
  checkmarkCircle,
  closeCircle,
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

// Native Ionic port of the desktop ProfileForm (features/profile-form). Kept as
// a single page component because it's a one-off screen driven by a toolbar
// "Done" button — no reuse that would justify splitting into a feature slice.
// Data layer, i18n keys and validation rules are shared with the desktop form.
const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: profileData } = useMasterProfileQuery(userId)
const updateMutation = useUpdateMasterProfileMutation(userId)
const uploadAvatarMutation = useUploadMasterAvatarMutation(userId)
const removeAvatarMutation = useRemoveMasterAvatarMutation(userId)

interface ProfileFormState {
  first_name: string
  last_name: string
  username: string
  specializations: string[]
  bio: string
}

const state = ref<ProfileFormState>({
  first_name: '',
  last_name: '',
  username: '',
  specializations: [],
  bio: '',
})

const { isDirty, isSaving, reset } = useDirtyForm(state, {
  message: t('common.unsavedChangesConfirm'),
})

// The username the profile was loaded with — counts as "available".
const loadedUsername = ref('')

function seed(profile: MasterProfile) {
  state.value = {
    first_name: profile.first_name ?? '',
    last_name: profile.last_name ?? '',
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

async function showToast(message: string, color: 'success' | 'danger') {
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
const isFirstNameFilled = computed(() => state.value.first_name.trim().length > 0)
const isLastNameFilled = computed(() => state.value.last_name.trim().length > 0)
const isUsernameFilled = computed(() => state.value.username.trim().length > 0)
const hasSpecialization = computed(() => state.value.specializations.length > 0)

const requiredMsg = computed(() => t('settings.profile.requiredField'))

const firstNameError = computed(() =>
  isDirty.value && !isFirstNameFilled.value ? requiredMsg.value : undefined,
)
const lastNameError = computed(() =>
  isDirty.value && !isLastNameFilled.value ? requiredMsg.value : undefined,
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
    isFirstNameFilled.value &&
    isLastNameFilled.value &&
    isUsernameFilled.value &&
    hasSpecialization.value &&
    usernameStatus.value !== 'taken' &&
    usernameStatus.value !== 'invalid',
)

const canSave = computed(() => isDirty.value && isFormValid.value)

// --- Actions ------------------------------------------------------------------
async function onSave() {
  if (!canSave.value) return
  isSaving.value = true
  try {
    await updateMutation.mutateAsync({
      first_name: state.value.first_name.trim(),
      last_name: state.value.last_name.trim(),
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

async function copyLink() {
  await navigator.clipboard.writeText(publicUrl.value)
  await showToast(t('settings.profile.linkCopied'), 'success')
}

function openPage() {
  window.open(publicUrl.value, '_blank', 'noopener')
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/settings" />
        </ion-buttons>
        <ion-title>{{ $t('settings.profile.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button strong :disabled="!canSave || isSaving" @click="onSave">
            <ion-spinner v-if="isSaving" name="crescent" />
            <span v-else>{{ $t('common.done') }}</span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Avatar -->
      <ion-list inset>
        <ion-item lines="none">
          <ion-avatar slot="start" class="profile-avatar">
            <img v-if="avatarSrc" :src="avatarSrc" :alt="$t('settings.profile.title')" />
            <ion-icon v-else :icon="personOutline" aria-hidden="true" />
          </ion-avatar>
          <div class="avatar-actions">
            <ion-button
              size="small"
              fill="outline"
              :disabled="isAvatarBusy"
              @click="pickAvatar"
            >
              <ion-spinner v-if="uploadAvatarMutation.isLoading.value" name="crescent" />
              <template v-else>
                <ion-icon slot="start" :icon="cloudUploadOutline" aria-hidden="true" />
                {{ $t('settings.profile.avatar.upload') }}
              </template>
            </ion-button>
            <ion-button
              v-if="hasAvatar"
              size="small"
              fill="clear"
              color="medium"
              :disabled="isAvatarBusy"
              @click="removeAvatar"
            >
              <ion-spinner v-if="removeAvatarMutation.isLoading.value" name="crescent" />
              <template v-else>
                <ion-icon slot="start" :icon="trashOutline" aria-hidden="true" />
                {{ $t('settings.profile.avatar.remove') }}
              </template>
            </ion-button>
          </div>
        </ion-item>
        <ion-note class="avatar-hint">{{ $t('settings.profile.avatar.hint') }}</ion-note>
        <input
          ref="fileInput"
          type="file"
          accept="image/png,image/jpeg"
          class="hidden-file-input"
          @change="onAvatarSelected"
        />
      </ion-list>

      <!-- Name -->
      <ion-list inset>
        <ion-item>
          <ion-input
            v-model="state.first_name"
            label-placement="stacked"
            :label="$t('settings.profile.firstName')"
            :placeholder="$t('settings.profile.firstNamePlaceholder')"
            :class="{ 'ion-invalid': firstNameError, 'ion-touched': isDirty }"
            :error-text="firstNameError"
            autocapitalize="words"
            enterkeyhint="next"
          />
        </ion-item>
        <ion-item>
          <ion-input
            v-model="state.last_name"
            label-placement="stacked"
            :label="$t('settings.profile.lastName')"
            :placeholder="$t('settings.profile.lastNamePlaceholder')"
            :class="{ 'ion-invalid': lastNameError, 'ion-touched': isDirty }"
            :error-text="lastNameError"
            autocapitalize="words"
            enterkeyhint="next"
          />
        </ion-item>
      </ion-list>

      <!-- Username -->
      <ion-list inset>
        <ion-item>
          <ion-input
            v-model="state.username"
            label-placement="stacked"
            :label="$t('settings.profile.username')"
            autocapitalize="off"
            autocomplete="off"
            :spellcheck="false"
            :class="{ 'ion-invalid': usernameError, 'ion-touched': isDirty }"
            :error-text="usernameError"
          >
            <ion-spinner
              v-if="usernameStatus === 'checking'"
              slot="end"
              name="dots"
            />
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
          </ion-input>
        </ion-item>
        <ion-note class="field-hint">{{ publicUrl }}</ion-note>
      </ion-list>

      <!-- Specialization -->
      <ion-list inset>
        <ion-list-header>
          <ion-label>{{ $t('settings.profile.specialization') }}</ion-label>
        </ion-list-header>
        <div class="chips">
          <ion-chip
            v-for="code in SPECIALIZATION_CODES"
            :key="code"
            :outline="!isSpecializationSelected(code)"
            :color="isSpecializationSelected(code) ? 'primary' : 'medium'"
            @click="toggleSpecialization(code)"
          >
            <ion-icon
              v-if="isSpecializationSelected(code)"
              :icon="checkmark"
              aria-hidden="true"
            />
            <ion-label>{{ $t(`onboarding.step1.categories.${code}`) }}</ion-label>
          </ion-chip>
        </div>
        <ion-note v-if="specializationError" color="danger" class="field-hint">
          {{ specializationError }}
        </ion-note>
      </ion-list>

      <!-- Bio -->
      <ion-list inset>
        <ion-item>
          <ion-textarea
            v-model="state.bio"
            :auto-grow="true"
            :rows="4"
            :maxlength="500"
            :counter="true"
            label-placement="stacked"
            :label="$t('settings.profile.bio')"
            :placeholder="$t('settings.profile.bioPlaceholder')"
          />
        </ion-item>
      </ion-list>

      <!-- Public page actions -->
      <ion-list inset>
        <ion-item button :detail="false" @click="openPage">
          <ion-icon slot="start" :icon="openOutline" aria-hidden="true" />
          <ion-label>{{ $t('settings.profile.openPage') }}</ion-label>
        </ion-item>
        <ion-item button lines="none" :detail="false" @click="copyLink">
          <ion-icon slot="start" :icon="linkOutline" aria-hidden="true" />
          <ion-label>{{ $t('settings.profile.copyLink') }}</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.profile-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ion-color-light, #f4f5f8);
}

.profile-avatar ion-icon {
  font-size: 28px;
  color: var(--ion-color-medium, #92949c);
}

.avatar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.avatar-hint,
.field-hint {
  display: block;
  padding-inline: 16px;
  padding-bottom: 8px;
  font-size: 0.75rem;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 12px 12px;
}

.hidden-file-input {
  display: none;
}
</style>
