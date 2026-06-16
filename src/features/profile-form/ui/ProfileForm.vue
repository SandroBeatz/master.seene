<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { watchDebounced } from '@vueuse/core'
import { useSessionStore } from '@entities/session'
import {
  isUsernameAvailable,
  useMasterProfileQuery,
  useUpdateMasterProfileMutation,
} from '@entities/master'
import type { MasterProfile } from '@entities/master'
import { useDirtyForm } from '@shared/lib/forms'
import { FormSaveBar, Typography } from '@shared/ui'
import { SPECIALIZATION_CODES } from '../config/specializations'

defineOptions({ name: 'ProfileForm' })

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: profileData } = useMasterProfileQuery(userId)
const updateMutation = useUpdateMasterProfileMutation(userId)

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

// --- Avatar (local-only preview, not persisted) -------------------------------
const fileInput = ref<HTMLInputElement | null>(null)
const avatarUrl = ref<string | null>(null)

function pickAvatar() {
  fileInput.value?.click()
}

function onAvatarSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (avatarUrl.value) URL.revokeObjectURL(avatarUrl.value)
  avatarUrl.value = URL.createObjectURL(file)
}

function removeAvatar() {
  if (avatarUrl.value) URL.revokeObjectURL(avatarUrl.value)
  avatarUrl.value = null
  if (fileInput.value) fileInput.value.value = ''
}

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
const USERNAME_PATTERN = /^[a-z0-9.]+$/
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

const publicUrl = computed(() => `https://seene.app/${state.value.username || loadedUsername.value}`)

const canSave = computed(
  () => isDirty.value && usernameStatus.value !== 'taken' && usernameStatus.value !== 'invalid',
)

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
  toast.add({ title: t('settings.profile.linkCopied'), color: 'success' })
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
        <p class="text-sm text-muted">{{ t('settings.profile.subtitle') }}</p>
      </div>
    </template>

    <div class="flex flex-col gap-6">
      <!-- Avatar -->
      <div class="flex items-center gap-4">
        <UAvatar :src="avatarUrl ?? undefined" icon="i-lucide-user" size="2xl" />
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="outline"
              leading-icon="i-lucide-upload"
              @click="pickAvatar"
            >
              {{ t('settings.profile.avatar.upload') }}
            </UButton>
            <UButton
              v-if="avatarUrl"
              color="neutral"
              variant="ghost"
              leading-icon="i-lucide-trash-2"
              @click="removeAvatar"
            >
              {{ t('settings.profile.avatar.remove') }}
            </UButton>
          </div>
          <p class="text-xs text-dimmed">{{ t('settings.profile.avatar.hint') }}</p>
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
        <UFormField :label="t('settings.profile.firstName')">
          <UInput
            v-model="state.first_name"
            :placeholder="t('settings.profile.firstNamePlaceholder')"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('settings.profile.lastName')">
          <UInput
            v-model="state.last_name"
            :placeholder="t('settings.profile.lastNamePlaceholder')"
            class="w-full"
          />
        </UFormField>
      </div>

      <!-- Specialization -->
      <UFormField
        :label="t('settings.profile.specialization')"
        :description="t('settings.profile.specializationHint')"
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
          <span class="text-xs text-dimmed">{{ state.bio.length }}/500</span>
        </template>
      </UFormField>

      <!-- Username -->
      <UFormField
        :label="t('settings.profile.username')"
        :description="t('settings.profile.usernameHint')"
        :error="usernameStatus === 'invalid' ? t('settings.profile.usernameInvalid') : undefined"
      >
        <UInput v-model="state.username" class="w-full">
          <template #leading>
            <span class="text-sm text-dimmed">seene.app/</span>
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
        <UButton
          color="neutral"
          variant="outline"
          leading-icon="i-lucide-link"
          @click="copyLink"
        >
          {{ t('settings.profile.copyLink') }}
        </UButton>
      </div>
    </div>

    <FormSaveBar :dirty="canSave" :saving="isSaving" @save="onSave" @discard="onDiscard" />
  </UCard>
</template>
