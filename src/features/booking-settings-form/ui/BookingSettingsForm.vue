<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@entities/session'
import {
  useMasterPreferencesQuery,
  useUpdateMasterBookingSettingsMutation,
} from '@entities/master'
import { useDirtyForm } from '@shared/lib/forms'
import { FormSaveBar, Typography } from '@shared/ui'
import { useBookingSettings } from '../model/use-booking-settings'

defineOptions({ name: 'BookingSettingsForm' })

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: preferences, isPending } = useMasterPreferencesQuery(userId)
const updateMutation = useUpdateMasterBookingSettingsMutation(userId)

const { state, onlineEnabled, seed, toUpdate, toOnlineUpdate } = useBookingSettings()
const { isDirty, isSaving, reset, discard } = useDirtyForm(state, {
  message: t('common.unsavedChangesConfirm'),
})

watch(
  preferences,
  (prefs) => {
    if (!prefs || isDirty.value) return
    seed(prefs)
    reset()
  },
  { immediate: true },
)

// Buffer between appointments — minutes added after each booking.
const BUFFER_VALUES = [0, 5, 10, 15, 20, 30, 45, 60]
const bufferItems = computed(() =>
  BUFFER_VALUES.map((value) => ({
    value,
    label: value === 0 ? t('settings.booking.bufferNone') : t('settings.booking.minutesShort', { count: value }),
  })),
)

// Minimum notice — fixed option set, each with its own translation key so the
// labels stay grammatically correct in every locale (no plural engine needed).
const NOTICE_OPTIONS: { value: number; key: string }[] = [
  { value: 0, key: 'noticeNone' },
  { value: 30, key: 'notice30m' },
  { value: 60, key: 'notice1h' },
  { value: 120, key: 'notice2h' },
  { value: 240, key: 'notice4h' },
  { value: 720, key: 'notice12h' },
  { value: 1440, key: 'notice1d' },
  { value: 2880, key: 'notice2d' },
]
const noticeItems = computed(() =>
  NOTICE_OPTIONS.map((option) => ({
    value: option.value,
    label: t(`settings.booking.${option.key}`),
  })),
)

const enabled = computed(() => onlineEnabled.value)

// Online booking saves instantly on toggle (optimistic), independent of the
// Save bar that governs the body fields below.
const isTogglingOnline = ref(false)

async function onToggleOnline(value: boolean) {
  if (!preferences.value) return
  const previous = onlineEnabled.value
  onlineEnabled.value = value
  isTogglingOnline.value = true
  try {
    await updateMutation.mutateAsync(toOnlineUpdate(preferences.value, value))
    toast.add({ title: t('settings.booking.saveSuccess'), color: 'success' })
  } catch {
    onlineEnabled.value = previous
    toast.add({ title: t('settings.booking.saveError'), color: 'error' })
  } finally {
    isTogglingOnline.value = false
  }
}

async function onSave() {
  if (!isDirty.value) return
  isSaving.value = true
  try {
    await updateMutation.mutateAsync(toUpdate())
    reset()
    toast.add({ title: t('settings.booking.saveSuccess'), color: 'success' })
  } catch {
    toast.add({ title: t('settings.booking.saveError'), color: 'error' })
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
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex flex-col gap-1">
          <Typography variant="h5" class="text-highlighted font-bold">
            {{ t('settings.booking.title') }}
          </Typography>
          <Typography variant="caption" class="text-muted">
            {{ t('settings.booking.subtitle') }}
          </Typography>
        </div>

        <USkeleton v-if="isPending" class="h-9 w-28 shrink-0 self-start rounded-full" />
        <div
          v-else
          class="flex shrink-0 items-center gap-2.5 self-start rounded-full px-3 py-1.5 ring-1 transition-colors"
          :class="enabled ? 'bg-success/10 ring-success/25' : 'bg-elevated ring-default'"
        >
          <span
            class="text-sm font-medium whitespace-nowrap"
            :class="enabled ? 'text-success' : 'text-muted'"
          >
            {{ enabled ? t('settings.booking.onlineOn') : t('settings.booking.onlineOff') }}
          </span>
          <USwitch
            :model-value="onlineEnabled"
            :loading="isTogglingOnline"
            color="success"
            :aria-label="t('settings.booking.onlineToggleAria')"
            @update:model-value="onToggleOnline"
          />
        </div>
      </div>
    </template>

    <!-- Loading skeletons -->
    <div v-if="isPending" class="divide-y divide-default">
      <div
        v-for="i in 3"
        :key="i"
        class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex flex-col gap-1.5">
          <USkeleton class="h-4 w-40" />
          <USkeleton class="h-3 w-56" />
        </div>
        <USkeleton class="h-9 w-40 shrink-0 rounded-md" />
      </div>
    </div>

    <div v-else class="divide-y divide-default">
      <!-- Default status for new bookings -->
      <div
        class="flex flex-col gap-3 py-4 transition-opacity sm:flex-row sm:items-center sm:justify-between"
        :class="{ 'opacity-50': !enabled }"
      >
        <div class="flex flex-col gap-0.5">
          <span class="font-medium text-highlighted">
            {{ t('settings.booking.defaultStatus') }}
          </span>
          <span class="text-sm text-muted">
            {{ t('settings.booking.defaultStatusDescription') }}
          </span>
        </div>
        <UFieldGroup>
          <UButton
            :variant="state.defaultStatus === 'confirmed' ? 'solid' : 'outline'"
            color="neutral"
            :disabled="!enabled"
            @click="state.defaultStatus = 'confirmed'"
          >
            {{ t('settings.booking.statusAutoConfirmed') }}
          </UButton>
          <UButton
            :variant="state.defaultStatus === 'pending' ? 'solid' : 'outline'"
            color="neutral"
            :disabled="!enabled"
            @click="state.defaultStatus = 'pending'"
          >
            {{ t('settings.booking.statusNeedsConfirmation') }}
          </UButton>
        </UFieldGroup>
      </div>

      <!-- Buffer between appointments -->
      <div
        class="flex flex-col gap-3 py-4 transition-opacity sm:flex-row sm:items-center sm:justify-between"
        :class="{ 'opacity-50': !enabled }"
      >
        <div class="flex flex-col gap-0.5">
          <span class="font-medium text-highlighted">
            {{ t('settings.booking.buffer') }}
          </span>
          <span class="text-sm text-muted">
            {{ t('settings.booking.bufferDescription') }}
          </span>
        </div>
        <USelect
          v-model="state.bufferMinutes"
          :items="bufferItems"
          value-key="value"
          :disabled="!enabled"
          class="w-40 shrink-0"
        />
      </div>

      <!-- Minimum notice -->
      <div
        class="flex flex-col gap-3 py-4 transition-opacity sm:flex-row sm:items-center sm:justify-between"
        :class="{ 'opacity-50': !enabled }"
      >
        <div class="flex flex-col gap-0.5">
          <span class="font-medium text-highlighted">
            {{ t('settings.booking.minNotice') }}
          </span>
          <span class="text-sm text-muted">
            {{ t('settings.booking.minNoticeDescription') }}
          </span>
        </div>
        <USelect
          v-model="state.minNoticeMinutes"
          :items="noticeItems"
          value-key="value"
          :disabled="!enabled"
          class="w-40 shrink-0"
        />
      </div>
    </div>

    <FormSaveBar :dirty="isDirty" :saving="isSaving" @save="onSave" @discard="onDiscard" />
  </UCard>
</template>
