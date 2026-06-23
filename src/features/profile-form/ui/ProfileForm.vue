<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { watchDebounced } from '@vueuse/core'
import { useSessionStore } from '@entities/session'
import {
  isUsernameAvailable,
  useMasterProfileQuery,
  useRemoveMasterAvatarMutation,
  useUpdateMasterProfileMutation,
  useUploadMasterAvatarMutation,
} from '@entities/master'
import type { MasterProfile } from '@entities/master'
import { resizeImageToSquare } from '@shared/lib/image'
import { useDirtyForm } from '@shared/lib/forms'
import { PUBLIC_BOOKING_HOST, bookingPageUrl } from '@shared/config'
import { FormSaveBar, Typography } from '@shared/ui'
import { SPECIALIZATION_CODES } from '../config/specializations'

defineOptions({ name: 'ProfileForm' })

const { t } = useI18n()
const toast = useToast()
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

const { isDirty, isSaving, reset, discard } = useDirtyForm(state, {
  message: t('common.unsavedChangesConfirm'),
})

// The username the profile was loaded with — counts as "available".
const loadedUsername = ref('')

// Seed the form from the cached profile query. Re-seeds when the cache updates
// (e.g. after saving), but never clobbers in-progress edits.
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

// --- Avatar (eager: uploaded/removed independently of the Save bar) ------------
// Avatar changes persist immediately on file select / remove — they do NOT flow
// through the dirty-form Save bar, so they never mark the form dirty.
const ACCEPTED_AVATAR_TYPES = ['image/png', 'image/jpeg']
const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5 MB

const fileInput = ref<HTMLInputElement | null>(null)
// Local optimistic preview (objectURL) shown after a successful pick; otherwise
// we fall back to the persisted avatar from the profile query.
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
    toast.add({ title: t('settings.profile.avatar.invalidType'), color: 'error' })
    clearFileInput()
    return
  }
  if (file.size > MAX_AVATAR_BYTES) {
    toast.add({ title: t('settings.profile.avatar.tooLarge'), color: 'error' })
    clearFileInput()
    return
  }

  try {
    const blob = await resizeImageToSquare(file, 512)
    setPreview(URL.createObjectURL(blob))
    await uploadAvatarMutation.mutateAsync(blob)
    // Keep the dashboard header / widgets in sync (they read the session profile).
    await sessionStore.refreshProfile()
    toast.add({ title: t('settings.profile.avatar.uploadSuccess'), color: 'success' })
  } catch {
    // Roll back the optimistic preview; fall back to the persisted avatar.
    setPreview(null)
    toast.add({ title: t('settings.profile.avatar.uploadError'), color: 'error' })
  } finally {
    clearFileInput()
  }
}

async function removeAvatar() {
  try {
    await removeAvatarMutation.mutateAsync()
    setPreview(null)
    await sessionStore.refreshProfile()
    toast.add({ title: t('settings.profile.avatar.removeSuccess'), color: 'success' })
  } catch {
    toast.add({ title: t('settings.profile.avatar.removeError'), color: 'error' })
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

// The static `https://host/` prefix shown inside the username input. Its length
// drives the input's start padding so the typed value never overlaps the prefix.
const usernamePrefix = `https://${PUBLIC_BOOKING_HOST}/`

// --- Required-field validation ------------------------------------------------
// Errors only surface once the form is dirty, so a freshly-loaded (or empty)
// profile doesn't greet the user with a wall of red.
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
    toast.add({ title: t('settings.profile.saveSuccess'), color: 'success' })
  } catch {
    toast.add({ title: t('settings.profile.saveError'), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

function onDiscard() {
  discard()
  usernameStatus.value = 'idle'
}

async function copyLink() {
  await navigator.clipboard.writeText(publicUrl.value)
  toast.add({
    icon: 'i-lucide-check',
    title: t('settings.profile.linkCopied'),
    color: 'success',
  })
}

function openPage() {
  window.open(publicUrl.value, '_blank', 'noopener')
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
          {{ t('settings.profile.title') }}
        </Typography>
        <Typography variant="caption" class="text-muted">
          {{ t('settings.profile.subtitle') }}
        </Typography>
      </div>
    </template>

    <div class="flex flex-col gap-6">
      <!-- Avatar -->
      <div class="flex items-center gap-4">
        <UAvatar :src="avatarSrc" icon="i-lucide-user" size="4xl" />
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <UButton
              size="sm"
              color="neutral"
              variant="outline"
              leading-icon="i-lucide-upload"
              :loading="uploadAvatarMutation.isLoading.value"
              :disabled="isAvatarBusy"
              @click="pickAvatar"
            >
              {{ t('settings.profile.avatar.upload') }}
            </UButton>
            <UButton
              v-if="hasAvatar"
              size="sm"
              color="neutral"
              variant="ghost"
              leading-icon="i-lucide-trash-2"
              :loading="removeAvatarMutation.isLoading.value"
              :disabled="isAvatarBusy"
              @click="removeAvatar"
            >
              {{ t('settings.profile.avatar.remove') }}
            </UButton>
          </div>
          <Typography variant="endnote" class="text-dimmed">
            {{ t('settings.profile.avatar.hint') }}
          </Typography>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/png,image/jpeg"
          class="hidden"
          @change="onAvatarSelected"
        />
      </div>

      <!-- Name -->
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField required :label="t('settings.profile.firstName')" :error="firstNameError">
          <UInput
            v-model="state.first_name"
            :placeholder="t('settings.profile.firstNamePlaceholder')"
            class="w-full"
          />
        </UFormField>
        <UFormField required :label="t('settings.profile.lastName')" :error="lastNameError">
          <UInput
            v-model="state.last_name"
            :placeholder="t('settings.profile.lastNamePlaceholder')"
            class="w-full"
          />
        </UFormField>
      </div>

      <!-- Specialization -->
      <UFormField
        required
        :label="t('settings.profile.specialization')"
        :description="t('settings.profile.specializationHint')"
        :error="specializationError"
      >
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="code in SPECIALIZATION_CODES"
            :key="code"
            size="sm"
            color="neutral"
            :variant="isSpecializationSelected(code) ? 'solid' : 'outline'"
            :leading-icon="isSpecializationSelected(code) ? 'i-lucide-check' : undefined"
            @click="toggleSpecialization(code)"
          >
            {{ t(`onboarding.step1.categories.${code}`) }}
          </UButton>
        </div>
      </UFormField>

      <!-- Bio -->
      <UFormField :label="t('settings.profile.bio')">
        <UTextarea
          v-model="state.bio"
          :rows="4"
          :maxlength="500"
          :placeholder="t('settings.profile.bioPlaceholder')"
          class="w-full"
        />
        <template #hint>
          <Typography as="span" variant="endnote" class="text-dimmed">
            {{ state.bio.length }}/500
          </Typography>
        </template>
      </UFormField>

      <!-- Username -->
      <UFormField
        required
        :label="t('settings.profile.username')"
        :description="t('settings.profile.usernameHint')"
        :error="usernameError"
      >
        <UInput
          v-model="state.username"
          class="w-full"
          :style="{ '--username-prefix-length': `${usernamePrefix.length * 0.695 + 2}ch` }"
          :ui="{
            base: 'ps-(--username-prefix-length)',
            leading: 'pointer-events-none',
          }"
        >
          <template #leading>
            <UIcon name="i-lucide-globe" class="size-3.5 text-muted mr-1.5" />
            <Typography variant="endnote" class="text-muted">{{ usernamePrefix }}</Typography>
          </template>
          <template #trailing>
            <span
              v-if="usernameStatus === 'checking'"
              class="flex items-center gap-1 text-xs text-dimmed"
            >
              <UIcon name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
            </span>
            <span
              v-else-if="usernameStatus === 'available'"
              class="flex items-center gap-1 text-xs text-success"
            >
              <UIcon name="i-lucide-check" class="size-3.5" />
              {{ t('settings.profile.usernameAvailable') }}
            </span>
            <span
              v-else-if="usernameStatus === 'taken'"
              class="flex items-center gap-1 text-xs text-error"
            >
              <UIcon name="i-lucide-x" class="size-3.5" />
              {{ t('settings.profile.usernameTaken') }}
            </span>
          </template>
        </UInput>
      </UFormField>

      <!-- Public page actions -->
      <div class="flex flex-wrap items-center gap-2">
        <UButton color="neutral" leading-icon="i-lucide-external-link" @click="openPage">
          {{ t('settings.profile.openPage') }}
        </UButton>
        <UButton color="neutral" variant="outline" leading-icon="i-lucide-link" @click="copyLink">
          {{ t('settings.profile.copyLink') }}
        </UButton>
      </div>
    </div>

    <FormSaveBar :dirty="canSave" :saving="isSaving" @save="onSave" @discard="onDiscard" />
  </UCard>
</template>
