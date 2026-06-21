<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@entities/session'
import {
  CLIENT_REMINDER_OFFSET_VALUES,
  useMasterPreferencesQuery,
  useUpdateMasterNotificationSettingsMutation,
} from '@entities/master'
import { useDirtyForm } from '@shared/lib/forms'
import { FormSaveBar, Typography } from '@shared/ui'
import { useNotificationSettings } from '../model/use-notification-settings'

defineOptions({ name: 'NotificationSettingsForm' })

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: preferences, isPending } = useMasterPreferencesQuery(userId)
const updateMutation = useUpdateMasterNotificationSettingsMutation(userId)

const { state, seed, toUpdate, toggleOffset } = useNotificationSettings()
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

// Labels for the "when to remind" checkboxes, keyed by minutes-before value.
const REMINDER_OFFSET_LABELS: Record<number, string> = {
  1440: t('settings.notifications.remind24h'),
  120: t('settings.notifications.remind2h'),
  60: t('settings.notifications.remind1h'),
}
const reminderOffsetItems = computed(() =>
  CLIENT_REMINDER_OFFSET_VALUES.map((value) => ({
    value,
    label: REMINDER_OFFSET_LABELS[value] ?? String(value),
  })),
)

// "Heads-up before each appointment" offset — reuses the booking "X before"
// labels so we don't duplicate translations.
const UPCOMING_OFFSET_OPTIONS: { value: number; key: string }[] = [
  { value: 30, key: 'notice30m' },
  { value: 60, key: 'notice1h' },
  { value: 120, key: 'notice2h' },
  { value: 240, key: 'notice4h' },
  { value: 720, key: 'notice12h' },
  { value: 1440, key: 'notice1d' },
]
const upcomingOffsetItems = computed(() =>
  UPCOMING_OFFSET_OPTIONS.map((option) => ({
    value: option.value,
    label: t(`settings.booking.${option.key}`),
  })),
)

async function onSave() {
  if (!isDirty.value) return
  isSaving.value = true
  try {
    await updateMutation.mutateAsync(toUpdate())
    reset()
    toast.add({ title: t('settings.notifications.saveSuccess'), color: 'success' })
  } catch {
    toast.add({ title: t('settings.notifications.saveError'), color: 'error' })
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
          {{ t('settings.notifications.title') }}
        </Typography>
        <Typography variant="caption" class="text-muted">
          {{ t('settings.notifications.subtitle') }}
        </Typography>
      </div>
    </template>

    <!-- Loading skeletons -->
    <div v-if="isPending" class="divide-y divide-default">
      <div
        v-for="i in 4"
        :key="i"
        class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex flex-col gap-1.5">
          <USkeleton class="h-4 w-40" />
          <USkeleton class="h-3 w-56" />
        </div>
        <USkeleton class="h-6 w-11 shrink-0 rounded-full" />
      </div>
    </div>

    <template v-else>
      <!-- CLIENT REMINDERS -->
      <p class="pt-2 pb-1 text-xs font-medium tracking-wider text-muted uppercase">
        {{ t('settings.notifications.sectionClientReminders') }}
      </p>
      <div class="divide-y divide-default">
        <!-- WhatsApp reminders -->
        <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-col gap-0.5">
            <span class="font-medium text-highlighted">
              {{ t('settings.notifications.whatsappTitle') }}
            </span>
            <span class="text-sm text-muted">
              {{ t('settings.notifications.whatsappDescription') }}
            </span>
          </div>
          <USwitch
            v-model="state.clientWhatsappEnabled"
            :aria-label="t('settings.notifications.whatsappTitle')"
          />
        </div>

        <!-- When to remind -->
        <div
          class="flex flex-col gap-3 py-4 transition-opacity"
          :class="{ 'opacity-50': !state.clientWhatsappEnabled }"
        >
          <span class="text-xs font-medium tracking-wider text-muted uppercase">
            {{ t('settings.notifications.whenToRemind') }}
          </span>
          <div class="flex flex-wrap gap-x-6 gap-y-3">
            <UCheckbox
              v-for="item in reminderOffsetItems"
              :key="item.value"
              :model-value="state.clientReminderOffsets.includes(item.value)"
              :label="item.label"
              :disabled="!state.clientWhatsappEnabled"
              @update:model-value="
                (checked: boolean | 'indeterminate') => toggleOffset(item.value, checked === true)
              "
            />
          </div>
        </div>
      </div>

      <!-- YOUR ALERTS (IN-APP) -->
      <p class="pt-6 pb-1 text-xs font-medium tracking-wider text-muted uppercase">
        {{ t('settings.notifications.sectionYourAlerts') }}
      </p>
      <div class="divide-y divide-default">
        <!-- New booking -->
        <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-col gap-0.5">
            <span class="font-medium text-highlighted">
              {{ t('settings.notifications.alertNewBookingTitle') }}
            </span>
            <span class="text-sm text-muted">
              {{ t('settings.notifications.alertNewBookingDescription') }}
            </span>
          </div>
          <USwitch
            v-model="state.alertNewBooking"
            :aria-label="t('settings.notifications.alertNewBookingTitle')"
          />
        </div>

        <!-- Awaiting confirmation -->
        <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-col gap-0.5">
            <span class="font-medium text-highlighted">
              {{ t('settings.notifications.alertAwaitingTitle') }}
            </span>
            <span class="text-sm text-muted">
              {{ t('settings.notifications.alertAwaitingDescription') }}
            </span>
          </div>
          <USwitch
            v-model="state.alertAwaitingConfirmation"
            :aria-label="t('settings.notifications.alertAwaitingTitle')"
          />
        </div>

        <!-- Cancellations -->
        <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-col gap-0.5">
            <span class="font-medium text-highlighted">
              {{ t('settings.notifications.alertCancellationTitle') }}
            </span>
            <span class="text-sm text-muted">
              {{ t('settings.notifications.alertCancellationDescription') }}
            </span>
          </div>
          <USwitch
            v-model="state.alertCancellation"
            :aria-label="t('settings.notifications.alertCancellationTitle')"
          />
        </div>

        <!-- Upcoming appointment heads-up -->
        <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-col gap-0.5">
            <span class="font-medium text-highlighted">
              {{ t('settings.notifications.alertUpcomingTitle') }}
            </span>
            <span class="text-sm text-muted">
              {{ t('settings.notifications.alertUpcomingDescription') }}
            </span>
          </div>
          <div class="flex shrink-0 items-center gap-3">
            <USelect
              v-model="state.alertUpcomingOffsetMinutes"
              :items="upcomingOffsetItems"
              value-key="value"
              :disabled="!state.alertUpcomingEnabled"
              class="w-36"
            />
            <USwitch
              v-model="state.alertUpcomingEnabled"
              :aria-label="t('settings.notifications.alertUpcomingTitle')"
            />
          </div>
        </div>
      </div>
    </template>

    <FormSaveBar :dirty="isDirty" :saving="isSaving" @save="onSave" @discard="onDiscard" />
  </UCard>
</template>
