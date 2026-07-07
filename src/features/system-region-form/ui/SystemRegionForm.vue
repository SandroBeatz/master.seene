<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useColorMode } from '@vueuse/core'
import { useSessionStore } from '@entities/session'
import {
  useMasterPreferencesQuery,
  useMasterPreferencesStore,
  useUpdateMasterScheduleMutation,
  useUpdateMasterSystemSettingsMutation,
} from '@entities/master'
import type { AppLanguage } from '@entities/master'
import { useLocaleStore } from '@shared/lib/locale'
import { useFormats } from '@shared/lib/formats'
import { CURRENCIES } from '@shared/config/currencies'
import { DATE_FORMATS } from '@shared/config/date-formats'
import { useDirtyForm } from '@shared/lib/forms'
import { FormSaveBar, Typography } from '@shared/ui'
import { useSystemSettings } from '../model/use-system-settings'

defineOptions({ name: 'SystemRegionForm' })

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
const localeStore = useLocaleStore()
const { store: themePreference } = useColorMode()
const formats = useFormats()

const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: preferences, isPending } = useMasterPreferencesQuery(userId)
const updateSystemMutation = useUpdateMasterSystemSettingsMutation(userId)
const updateScheduleMutation = useUpdateMasterScheduleMutation(userId)

const { state, seed, toUpdate, toScheduleUpdate } = useSystemSettings()
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

// Language and theme apply live as the user edits (no immediate run, so the
// fast localStorage value picked at boot isn't overwritten before settings
// load). Discarding reverts `state`, which fires these watchers back.
watch(
  () => state.value.language,
  (language) => localeStore.setLocale(language),
)
watch(
  () => state.value.theme,
  (theme) => {
    themePreference.value = theme
  },
)

// Interface language — native names (conventionally shown in their own language).
const LANGUAGES: { value: AppLanguage; label: string }[] = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
]

const themes = computed(() => [
  { value: 'light' as const, label: t('settings.systemRegion.themeLight'), icon: 'i-lucide-sun' },
  { value: 'dark' as const, label: t('settings.systemRegion.themeDark'), icon: 'i-lucide-moon' },
  {
    value: 'auto' as const,
    label: t('settings.systemRegion.themeSystem'),
    icon: 'i-lucide-monitor',
  },
])

const currencyItems = CURRENCIES.map((currency) => ({
  label: `${currency.symbol} ${currency.label}`,
  value: currency.code,
}))

const dateFormatItems = DATE_FORMATS

const SLOT_STEP_VALUES = [5, 10, 15, 20, 30, 60]
const slotStepItems = computed(() =>
  SLOT_STEP_VALUES.map((value) => ({
    value,
    label: t('settings.systemRegion.slotStepMinutes', { count: value }),
  })),
)

// Time zones with their current GMT offset, e.g. "Asia/Almaty (GMT+5)".
function timeZoneLabel(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date())
    const offset = parts.find((part) => part.type === 'timeZoneName')?.value ?? ''
    return offset ? `${timeZone} (${offset})` : timeZone
  } catch {
    return timeZone
  }
}

const FALLBACK_TIME_ZONES = [
  'Asia/Bishkek',
  'Asia/Almaty',
  'Asia/Tashkent',
  'Europe/Moscow',
  'Europe/Kyiv',
  'Asia/Tbilisi',
  'Asia/Yerevan',
  'Asia/Baku',
  'Europe/Minsk',
  'Europe/Chisinau',
  'America/New_York',
  'America/Toronto',
  'America/Los_Angeles',
  'Europe/Paris',
  'UTC',
]

const baseTimeZones =
  typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : FALLBACK_TIME_ZONES
const baseTimeZoneSet = new Set(baseTimeZones)
const baseTimeZoneItems = baseTimeZones.map((tz) => ({ label: timeZoneLabel(tz), value: tz }))

// Keep the currently saved zone selectable even if it isn't in the IANA list.
const timeZoneItems = computed(() => {
  const tz = state.value.timezone
  if (tz && !baseTimeZoneSet.has(tz)) {
    return [{ label: timeZoneLabel(tz), value: tz }, ...baseTimeZoneItems]
  }
  return baseTimeZoneItems
})

// Live preview of how prices and dates will look with the current selection.
const pricePreview = computed(() => formats.price(1234.56, state.value.currency))
const datePreview = computed(() => formats.date(new Date(), state.value.dateFormat))

async function onSave() {
  if (!isDirty.value) return
  isSaving.value = true
  try {
    const prefs = preferences.value
    const profile = prefs?.profile ?? null
    const timezoneChanged = Boolean(prefs) && state.value.timezone !== prefs?.timeZone

    const requests: Promise<unknown>[] = [updateSystemMutation.mutateAsync(toUpdate())]
    // Time zone lives in profile.schedule.timezone — persist it separately,
    // preserving the working-hours days. Skip when there's no profile row yet.
    if (timezoneChanged && profile) {
      requests.push(updateScheduleMutation.mutateAsync(toScheduleUpdate(profile)))
    }

    await Promise.all(requests)
    reset()
    // Refresh the global preferences store so app-wide consumers (price/date
    // formatting, the calendar widget) pick up the new settings without a reload.
    if (userId.value) void masterPreferencesStore.loadPreferences(userId.value)
    toast.add({ title: t('settings.systemRegion.saveSuccess'), color: 'success' })
  } catch {
    toast.add({ title: t('settings.systemRegion.saveError'), color: 'error' })
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
          {{ t('settings.systemRegion.title') }}
        </Typography>
        <Typography variant="caption" class="text-muted">
          {{ t('settings.systemRegion.subtitle') }}
        </Typography>
      </div>
    </template>

    <!-- Loading skeletons -->
    <div v-if="isPending" class="divide-y divide-default">
      <div
        v-for="i in 6"
        :key="i"
        class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex flex-col gap-1.5">
          <USkeleton class="h-4 w-40" />
          <USkeleton class="h-3 w-56" />
        </div>
        <USkeleton class="h-9 w-44 shrink-0 rounded-md" />
      </div>
    </div>

    <div v-else class="divide-y divide-default">
      <!-- Interface language -->
      <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="font-medium text-highlighted">{{
            t('settings.systemRegion.language')
          }}</span>
          <span class="text-sm text-muted">{{
            t('settings.systemRegion.languageDescription')
          }}</span>
        </div>
        <USelect
          v-model="state.language"
          :items="LANGUAGES"
          value-key="value"
          class="w-56 shrink-0"
        />
      </div>

      <!-- Theme -->
      <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="font-medium text-highlighted">{{ t('settings.systemRegion.theme') }}</span>
          <span class="text-sm text-muted">{{ t('settings.systemRegion.themeDescription') }}</span>
        </div>
        <UFieldGroup>
          <UButton
            v-for="theme in themes"
            :key="theme.value"
            :variant="state.theme === theme.value ? 'solid' : 'outline'"
            :leading-icon="theme.icon"
            color="neutral"
            @click="state.theme = theme.value"
          >
            {{ theme.label }}
          </UButton>
        </UFieldGroup>
      </div>

      <!-- Currency -->
      <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="font-medium text-highlighted">{{
            t('settings.systemRegion.currency')
          }}</span>
          <span class="text-sm text-muted">{{
            t('settings.systemRegion.currencyDescription')
          }}</span>
        </div>
        <USelectMenu
          v-model="state.currency"
          :items="currencyItems"
          value-key="value"
          class="w-56 shrink-0"
        />
      </div>

      <!-- Time format -->
      <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="font-medium text-highlighted">{{
            t('settings.systemRegion.timeFormat')
          }}</span>
          <span class="text-sm text-muted">{{
            t('settings.systemRegion.timeFormatDescription')
          }}</span>
        </div>
        <UFieldGroup>
          <UButton
            :variant="state.timeFormat === 12 ? 'solid' : 'outline'"
            color="neutral"
            @click="state.timeFormat = 12"
          >
            {{ t('settings.systemRegion.timeFormat12') }}
          </UButton>
          <UButton
            :variant="state.timeFormat === 24 ? 'solid' : 'outline'"
            color="neutral"
            @click="state.timeFormat = 24"
          >
            {{ t('settings.systemRegion.timeFormat24') }}
          </UButton>
        </UFieldGroup>
      </div>

      <!-- Date format -->
      <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="font-medium text-highlighted">{{
            t('settings.systemRegion.dateFormat')
          }}</span>
          <span class="text-sm text-muted">{{
            t('settings.systemRegion.dateFormatDescription')
          }}</span>
        </div>
        <USelect
          v-model="state.dateFormat"
          :items="dateFormatItems"
          value-key="value"
          class="w-56 shrink-0"
        />
      </div>

      <!-- Time zone -->
      <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="font-medium text-highlighted">{{
            t('settings.systemRegion.timeZone')
          }}</span>
          <span class="text-sm text-muted">{{
            t('settings.systemRegion.timeZoneDescription')
          }}</span>
        </div>
        <USelectMenu
          v-model="state.timezone"
          :items="timeZoneItems"
          value-key="value"
          class="w-64 shrink-0"
        />
      </div>

      <!-- First day of week -->
      <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="font-medium text-highlighted">{{
            t('settings.systemRegion.firstDay')
          }}</span>
          <span class="text-sm text-muted">{{
            t('settings.systemRegion.firstDayDescription')
          }}</span>
        </div>
        <UFieldGroup>
          <UButton
            :variant="state.firstDay === 1 ? 'solid' : 'outline'"
            color="neutral"
            @click="state.firstDay = 1"
          >
            {{ t('settings.systemRegion.firstDayMonday') }}
          </UButton>
          <UButton
            :variant="state.firstDay === 0 ? 'solid' : 'outline'"
            color="neutral"
            @click="state.firstDay = 0"
          >
            {{ t('settings.systemRegion.firstDaySunday') }}
          </UButton>
        </UFieldGroup>
      </div>

      <!-- Default calendar view -->
      <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="font-medium text-highlighted">{{
            t('settings.systemRegion.calendarView')
          }}</span>
          <span class="text-sm text-muted">{{
            t('settings.systemRegion.calendarViewDescription')
          }}</span>
        </div>
        <UFieldGroup>
          <UButton
            :variant="state.calendarView === 'timeGridDay' ? 'solid' : 'outline'"
            color="neutral"
            @click="state.calendarView = 'timeGridDay'"
          >
            {{ t('settings.systemRegion.calendarViewDay') }}
          </UButton>
          <UButton
            :variant="state.calendarView === 'timeGridWeek' ? 'solid' : 'outline'"
            color="neutral"
            @click="state.calendarView = 'timeGridWeek'"
          >
            {{ t('settings.systemRegion.calendarViewWeek') }}
          </UButton>
          <UButton
            :variant="state.calendarView === 'dayGridMonth' ? 'solid' : 'outline'"
            color="neutral"
            @click="state.calendarView = 'dayGridMonth'"
          >
            {{ t('settings.systemRegion.calendarViewMonth') }}
          </UButton>
        </UFieldGroup>
      </div>

      <!-- Time slot granularity -->
      <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="font-medium text-highlighted">{{
            t('settings.systemRegion.slotStep')
          }}</span>
          <span class="text-sm text-muted">{{
            t('settings.systemRegion.slotStepDescription')
          }}</span>
        </div>
        <USelect
          v-model="state.slotStepMinutes"
          :items="slotStepItems"
          value-key="value"
          class="w-56 shrink-0"
        />
      </div>

      <!-- Number / date preview -->
      <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="font-medium text-highlighted">{{ t('settings.systemRegion.preview') }}</span>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <UBadge color="neutral" variant="subtle" size="lg">{{ pricePreview }}</UBadge>
          <UBadge color="neutral" variant="subtle" size="lg">{{ datePreview }}</UBadge>
        </div>
      </div>
    </div>

    <FormSaveBar :dirty="isDirty" :saving="isSaving" @save="onSave" @discard="onDiscard" />
  </UCard>
</template>
