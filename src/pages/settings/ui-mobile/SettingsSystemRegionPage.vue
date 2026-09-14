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
  IonLabel,
  IonIcon,
  IonSkeletonText,
  IonSpinner,
  isPlatform,
  toastController,
} from '@ionic/vue'
import {
  arrowBackOutline,
  arrowUndoOutline,
  calendarClearOutline,
  calendarOutline,
  desktopOutline,
  moonOutline,
  sunnyOutline,
  todayOutline,
} from 'ionicons/icons'
import { useSessionStore } from '@entities/session'
import {
  useMasterPreferencesQuery,
  useMasterPreferencesStore,
  useUpdateMasterScheduleMutation,
  useUpdateMasterSystemSettingsMutation,
} from '@entities/master'
import type {
  AppLanguage,
  CalendarFirstDay,
  MasterCalendarViewType,
  ThemePreference,
  TimeFormat,
} from '@entities/master'
import { useSystemSettings } from '@features/system-region-form/index.mobile'
import { useLocaleStore } from '@shared/lib/locale'
import { useAppearanceStore, type ThemeMode } from '@shared/lib/appearance'
import { useFormats } from '@shared/lib/formats'
import { CURRENCIES } from '@shared/config/currencies'
import { DATE_FORMATS } from '@shared/config/date-formats'
import { useDirtyForm } from '@shared/lib/forms'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import { ListPickerModal } from '@shared/ui/list-picker-modal/index.mobile'

const { t } = useI18n()
const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
const localeStore = useLocaleStore()
const appearance = useAppearanceStore()
const formats = useFormats()
const saveSpinnerName = isPlatform('ios') ? 'dots' : 'crescent'

const userId = computed(() => sessionStore.session?.user.id ?? '')
const { data: preferences, isPending } = useMasterPreferencesQuery(userId)
const updateSystemMutation = useUpdateMasterSystemSettingsMutation(userId)
const updateScheduleMutation = useUpdateMasterScheduleMutation(userId)

const { state, seed, toUpdate, toScheduleUpdate } = useSystemSettings()
const { isDirty, isSaving, reset, discard } = useDirtyForm(state, {
  message: t('common.unsavedChangesConfirm'),
})

const savedAccentColor = ref(appearance.primary)
const isAccentDirty = computed(() => appearance.primary !== savedAccentColor.value)
const hasUnsavedChanges = computed(() => isDirty.value || isAccentDirty.value)

watch(
  preferences,
  (prefs) => {
    if (!prefs || isDirty.value || isAccentDirty.value) return
    seed(prefs)
    reset()
    savedAccentColor.value = appearance.primary
  },
  { immediate: true },
)

function toThemeMode(theme: ThemePreference): ThemeMode {
  return theme === 'auto' ? 'system' : theme
}

watch(
  () => state.value.language,
  (language) => localeStore.setLocale(language),
)
watch(
  () => state.value.theme,
  (theme) => appearance.setTheme(toThemeMode(theme)),
)

const presentingElement = ref<HTMLElement | null>(null)
onMounted(() => {
  presentingElement.value = document.querySelector('ion-router-outlet')
})

const LANGUAGES: { value: AppLanguage; label: string }[] = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
]

const currencyItems = CURRENCIES.map((currency) => ({
  label: `${currency.symbol} ${currency.label}`,
  value: currency.code,
}))
const dateFormatItems = DATE_FORMATS

const themeItems = computed(() => [
  { value: 'light', label: t('settings.systemRegion.themeLight'), icon: sunnyOutline },
  { value: 'dark', label: t('settings.systemRegion.themeDark'), icon: moonOutline },
  { value: 'auto', label: t('settings.systemRegion.themeSystem'), icon: desktopOutline },
])
const appearanceItems = computed(() =>
  appearance.presets.map((preset) => ({
    value: preset.key,
    label: t(`appearance.colors.${preset.key}`),
    swatchColor: preset.base,
  })),
)
const timeFormatItems = computed(() => [
  { value: 12, label: t('settings.systemRegion.timeFormat12') },
  { value: 24, label: t('settings.systemRegion.timeFormat24') },
])
const firstDayItems = computed(() => [
  { value: 1, label: t('settings.systemRegion.firstDayMonday') },
  { value: 0, label: t('settings.systemRegion.firstDaySunday') },
])
const calendarViewItems = computed(() => [
  {
    value: 'timeGridDay',
    label: t('settings.systemRegion.calendarViewDay'),
    icon: todayOutline,
  },
  {
    value: 'timeGridWeek',
    label: t('settings.systemRegion.calendarViewWeek'),
    icon: calendarClearOutline,
  },
  {
    value: 'dayGridMonth',
    label: t('settings.systemRegion.calendarViewMonth'),
    icon: calendarOutline,
  },
])

const SLOT_STEP_VALUES = [5, 10, 15, 20, 30, 60]
const slotStepItems = computed(() =>
  SLOT_STEP_VALUES.map((value) => ({
    value,
    label: t('settings.systemRegion.slotStepMinutes', { count: value }),
  })),
)

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
const allTimeZones = computed(() => {
  const timeZone = state.value.timezone
  return timeZone && !baseTimeZoneSet.has(timeZone) ? [timeZone, ...baseTimeZones] : baseTimeZones
})
const timeZoneItems = computed(() =>
  allTimeZones.value.map((timeZone) => ({
    value: timeZone,
    label: timeZoneLabel(timeZone),
  })),
)

const currentLanguageLabel = computed(
  () => LANGUAGES.find((item) => item.value === state.value.language)?.label ?? '',
)
const currentThemeLabel = computed(
  () => themeItems.value.find((item) => item.value === state.value.theme)?.label ?? '',
)
const currentAppearanceLabel = computed(
  () => appearanceItems.value.find((item) => item.value === appearance.primary)?.label ?? '',
)
const currentAccentColor = computed(
  () => appearance.presets.find((preset) => preset.key === appearance.primary)?.base,
)
const currentDateFormatLabel = computed(
  () => dateFormatItems.find((item) => item.value === state.value.dateFormat)?.label ?? '',
)
const currentTimeFormatLabel = computed(
  () => timeFormatItems.value.find((item) => item.value === state.value.timeFormat)?.label ?? '',
)
const currentTimeZoneLabel = computed(() => timeZoneLabel(state.value.timezone))
const currentFirstDayLabel = computed(
  () => firstDayItems.value.find((item) => item.value === state.value.firstDay)?.label ?? '',
)
const currentCalendarViewLabel = computed(
  () =>
    calendarViewItems.value.find((item) => item.value === state.value.calendarView)?.label ?? '',
)
const currentSlotStepLabel = computed(
  () => slotStepItems.value.find((item) => item.value === state.value.slotStepMinutes)?.label ?? '',
)
const pricePreview = computed(() => formats.price(1234.56, state.value.currency))

const skeletonGroups = computed(() => [
  { key: 'interface', header: t('settings.systemRegion.sectionInterface'), rows: 3 },
  { key: 'formats', header: t('settings.systemRegion.sectionFormats'), rows: 4 },
  { key: 'calendar', header: t('settings.systemRegion.sectionCalendar'), rows: 3 },
])

const isLanguageModalOpen = ref(false)
const isThemeModalOpen = ref(false)
const isAppearanceModalOpen = ref(false)
const isCurrencyModalOpen = ref(false)
const isDateFormatModalOpen = ref(false)
const isTimeFormatModalOpen = ref(false)
const isTimeZoneModalOpen = ref(false)
const isFirstDayModalOpen = ref(false)
const isCalendarViewModalOpen = ref(false)
const isSlotStepModalOpen = ref(false)

function onLanguageSelected(value: string | number) {
  state.value.language = value as AppLanguage
}
function onThemeSelected(value: string | number) {
  if (value === 'light' || value === 'dark' || value === 'auto') state.value.theme = value
}
function onAppearanceSelected(value: string | number) {
  const key = String(value)
  if (appearance.presets.some((preset) => preset.key === key)) appearance.setPrimary(key)
}
function onCurrencySelected(value: string | number) {
  state.value.currency = String(value)
}
function onDateFormatSelected(value: string | number) {
  state.value.dateFormat = String(value)
}
function onTimeFormatSelected(value: string | number) {
  state.value.timeFormat = (Number(value) === 12 ? 12 : 24) as TimeFormat
}
function onTimeZoneSelected(value: string | number) {
  state.value.timezone = String(value)
}
function onFirstDaySelected(value: string | number) {
  state.value.firstDay = (Number(value) === 0 ? 0 : 1) as CalendarFirstDay
}
function onCalendarViewSelected(value: string | number) {
  if (value === 'timeGridDay' || value === 'timeGridWeek' || value === 'dayGridMonth') {
    state.value.calendarView = value as MasterCalendarViewType
  }
}
function onSlotStepSelected(value: string | number) {
  const minutes = Number(value)
  if (SLOT_STEP_VALUES.includes(minutes)) state.value.slotStepMinutes = minutes
}

async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2000, color, position: 'top' })
  await toast.present()
}

async function onSave() {
  if (!hasUnsavedChanges.value || isSaving.value) return
  isSaving.value = true
  const systemSettingsChanged = isDirty.value

  try {
    if (systemSettingsChanged) {
      const prefs = preferences.value
      const profile = prefs?.profile ?? null
      const timezoneChanged = Boolean(prefs) && state.value.timezone !== prefs?.timeZone
      const requests: Promise<unknown>[] = [updateSystemMutation.mutateAsync(toUpdate())]

      if (timezoneChanged && profile) {
        requests.push(updateScheduleMutation.mutateAsync(toScheduleUpdate(profile)))
      }
      await Promise.all(requests)
    }

    reset()
    savedAccentColor.value = appearance.primary
    if (systemSettingsChanged && userId.value) {
      void masterPreferencesStore.loadPreferences(userId.value)
    }
    await showToast(t('settings.systemRegion.saveSuccess'), 'success')
  } catch {
    await showToast(t('settings.systemRegion.saveError'), 'danger')
  } finally {
    isSaving.value = false
  }
}

function onDiscard() {
  discard()
  appearance.setPrimary(savedAccentColor.value)
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
        <ion-title>{{ $t('settings.systemRegion.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="system-content ion-padding-vertical">
      <template v-if="isPending">
        <inset-list v-for="group in skeletonGroups" :key="group.key" :header="group.header">
          <ion-item v-for="index in group.rows" :key="index">
            <ion-label>
              <ion-skeleton-text :animated="true" class="skeleton-title" />
              <ion-skeleton-text :animated="true" class="skeleton-description" />
            </ion-label>
            <ion-skeleton-text slot="end" :animated="true" class="skeleton-value" />
          </ion-item>
        </inset-list>
      </template>

      <template v-else>
        <inset-list :header="$t('settings.systemRegion.sectionInterface')">
          <ion-item button detail @click="isLanguageModalOpen = true">
            <ion-label class="setting-copy">
              <h2>{{ $t('settings.systemRegion.language') }}</h2>
              <p>{{ $t('settings.systemRegion.languageDescription') }}</p>
            </ion-label>
            <ion-label slot="end" class="setting-value">{{ currentLanguageLabel }}</ion-label>
          </ion-item>

          <ion-item button detail @click="isThemeModalOpen = true">
            <ion-label class="setting-copy">
              <h2>{{ $t('settings.systemRegion.theme') }}</h2>
              <p>{{ $t('settings.systemRegion.themeDescription') }}</p>
            </ion-label>
            <ion-label slot="end" class="setting-value">{{ currentThemeLabel }}</ion-label>
          </ion-item>

          <ion-item button detail @click="isAppearanceModalOpen = true">
            <ion-label class="setting-copy">
              <h2>{{ $t('settings.systemRegion.appearance') }}</h2>
              <p>{{ $t('settings.systemRegion.appearanceDescription') }}</p>
            </ion-label>
            <div slot="end" class="setting-value setting-value--color">
              <span
                class="color-dot"
                :style="{ backgroundColor: currentAccentColor }"
                aria-hidden="true"
              />
              <span>{{ currentAppearanceLabel }}</span>
            </div>
          </ion-item>
        </inset-list>

        <inset-list :header="$t('settings.systemRegion.sectionFormats')">
          <ion-item button detail @click="isCurrencyModalOpen = true">
            <ion-label class="setting-copy">
              <h2>{{ $t('settings.systemRegion.currency') }}</h2>
              <p>{{ $t('settings.systemRegion.currencyDescription') }}</p>
            </ion-label>
            <div slot="end" class="setting-value setting-value--stacked">
              <span>{{ state.currency }}</span>
              <small>{{ pricePreview }}</small>
            </div>
          </ion-item>

          <ion-item button detail @click="isDateFormatModalOpen = true">
            <ion-label class="setting-copy">
              <h2>{{ $t('settings.systemRegion.dateFormat') }}</h2>
              <p>{{ $t('settings.systemRegion.dateFormatDescription') }}</p>
            </ion-label>
            <ion-label slot="end" class="setting-value">{{ currentDateFormatLabel }}</ion-label>
          </ion-item>

          <ion-item button detail @click="isTimeFormatModalOpen = true">
            <ion-label class="setting-copy">
              <h2>{{ $t('settings.systemRegion.timeFormat') }}</h2>
              <p>{{ $t('settings.systemRegion.timeFormatDescription') }}</p>
            </ion-label>
            <ion-label slot="end" class="setting-value">{{ currentTimeFormatLabel }}</ion-label>
          </ion-item>

          <ion-item button detail @click="isTimeZoneModalOpen = true">
            <ion-label class="setting-copy">
              <h2>{{ $t('settings.systemRegion.timeZone') }}</h2>
              <p>{{ $t('settings.systemRegion.timeZoneDescription') }}</p>
            </ion-label>
            <ion-label slot="end" class="setting-value setting-value--timezone">
              {{ currentTimeZoneLabel }}
            </ion-label>
          </ion-item>
        </inset-list>

        <inset-list :header="$t('settings.systemRegion.sectionCalendar')">
          <ion-item button detail @click="isFirstDayModalOpen = true">
            <ion-label class="setting-copy">
              <h2>{{ $t('settings.systemRegion.firstDay') }}</h2>
              <p>{{ $t('settings.systemRegion.firstDayDescription') }}</p>
            </ion-label>
            <ion-label slot="end" class="setting-value">{{ currentFirstDayLabel }}</ion-label>
          </ion-item>

          <ion-item button detail @click="isCalendarViewModalOpen = true">
            <ion-label class="setting-copy">
              <h2>{{ $t('settings.systemRegion.calendarView') }}</h2>
              <p>{{ $t('settings.systemRegion.calendarViewDescription') }}</p>
            </ion-label>
            <ion-label slot="end" class="setting-value">{{ currentCalendarViewLabel }}</ion-label>
          </ion-item>

          <ion-item button detail @click="isSlotStepModalOpen = true">
            <ion-label class="setting-copy">
              <h2>{{ $t('settings.systemRegion.slotStep') }}</h2>
              <p>{{ $t('settings.systemRegion.slotStepDescription') }}</p>
            </ion-label>
            <ion-label slot="end" class="setting-value">{{ currentSlotStepLabel }}</ion-label>
          </ion-item>
        </inset-list>
      </template>

      <list-picker-modal
        v-model:is-open="isLanguageModalOpen"
        :title="$t('settings.systemRegion.language')"
        :items="LANGUAGES"
        :model-value="state.language"
        sheet
        @update:model-value="onLanguageSelected"
      />
      <list-picker-modal
        v-model:is-open="isThemeModalOpen"
        :title="$t('settings.systemRegion.theme')"
        :items="themeItems"
        :model-value="state.theme"
        sheet
        @update:model-value="onThemeSelected"
      />
      <list-picker-modal
        v-model:is-open="isAppearanceModalOpen"
        :title="$t('settings.systemRegion.appearance')"
        :items="appearanceItems"
        :model-value="appearance.primary"
        sheet
        @update:model-value="onAppearanceSelected"
      />
      <list-picker-modal
        v-model:is-open="isCurrencyModalOpen"
        :title="$t('settings.systemRegion.currency')"
        :items="currencyItems"
        :model-value="state.currency"
        :presenting-element="presentingElement"
        @update:model-value="onCurrencySelected"
      />
      <list-picker-modal
        v-model:is-open="isDateFormatModalOpen"
        :title="$t('settings.systemRegion.dateFormat')"
        :items="dateFormatItems"
        :model-value="state.dateFormat"
        sheet
        @update:model-value="onDateFormatSelected"
      />
      <list-picker-modal
        v-model:is-open="isTimeFormatModalOpen"
        :title="$t('settings.systemRegion.timeFormat')"
        :items="timeFormatItems"
        :model-value="state.timeFormat"
        sheet
        @update:model-value="onTimeFormatSelected"
      />
      <list-picker-modal
        v-model:is-open="isTimeZoneModalOpen"
        :title="$t('settings.systemRegion.timeZone')"
        :items="timeZoneItems"
        :model-value="state.timezone"
        searchable
        :presenting-element="presentingElement"
        @update:model-value="onTimeZoneSelected"
      />
      <list-picker-modal
        v-model:is-open="isFirstDayModalOpen"
        :title="$t('settings.systemRegion.firstDay')"
        :items="firstDayItems"
        :model-value="state.firstDay"
        sheet
        @update:model-value="onFirstDaySelected"
      />
      <list-picker-modal
        v-model:is-open="isCalendarViewModalOpen"
        :title="$t('settings.systemRegion.calendarView')"
        :items="calendarViewItems"
        :model-value="state.calendarView"
        sheet
        @update:model-value="onCalendarViewSelected"
      />
      <list-picker-modal
        v-model:is-open="isSlotStepModalOpen"
        :title="$t('settings.systemRegion.slotStep')"
        :items="slotStepItems"
        :model-value="state.slotStepMinutes"
        sheet
        @update:model-value="onSlotStepSelected"
      />
    </ion-content>

    <ion-footer v-if="hasUnsavedChanges" :translucent="true" class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start" class="ion-padding-end">
          <ion-button
            color="medium"
            :disabled="isSaving"
            :aria-label="$t('common.discard')"
            @click="onDiscard"
          >
            <ion-icon slot="icon-only" :icon="arrowUndoOutline" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
        <ion-button
          class="save-button"
          expand="block"
          :disabled="isSaving"
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

.system-content {
  --padding-bottom: 20px;
}

.setting-copy {
  min-width: 0;
  margin-block: 10px;
}

.setting-copy h2,
.setting-copy p {
  margin: 0;
}

.setting-copy h2 {
  font-size: 0.95rem;
  font-weight: 500;
}

.setting-copy p {
  margin-top: 3px;
  color: var(--ion-color-medium);
  font-size: 0.76rem;
  line-height: 1.35;
  white-space: normal;
}

.setting-value {
  max-width: 42%;
  color: var(--ion-color-medium);
  font-size: 0.82rem;
  text-align: end;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.setting-value--color {
  display: flex;
  align-items: center;
  gap: 7px;
}

.setting-value--stacked {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.setting-value--stacked small {
  font-size: 0.7rem;
  opacity: 0.8;
}

.setting-value--timezone {
  max-width: 46%;
}

.color-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-title {
  width: 45%;
  height: 14px;
}

.skeleton-description {
  width: 72%;
  height: 10px;
  margin-top: 7px;
}

.skeleton-value {
  width: 76px;
  height: 18px;
}

ion-footer ion-toolbar {
  --padding-top: 16px;
  --padding-bottom: 16px;
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
