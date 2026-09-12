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
  IonLabel,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonSkeletonText,
  IonSpinner,
  IonModal,
  IonIcon,
  toastController,
} from '@ionic/vue'
import { checkmark } from 'ionicons/icons'
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
import { ListPickerModal } from '@shared/ui/list-picker-modal/index.mobile'

// Native Ionic port of the desktop SystemRegionForm. Reuses the pure
// state-mapping composable (useSystemSettings) and the shared data layer;
// language + theme apply live as the user edits, everything else is committed
// by the toolbar "Done" button. Theme is bridged to the mobile appearance
// store (light/dark/system), mapping the preferences' `auto` ⇄ `system`.
const { t } = useI18n()
const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
const localeStore = useLocaleStore()
const appearance = useAppearanceStore()
const formats = useFormats()

const userId = computed(() => sessionStore.session?.user.id ?? '')

const { data: preferences, isPending } = useMasterPreferencesQuery(userId)
const updateSystemMutation = useUpdateMasterSystemSettingsMutation(userId)
const updateScheduleMutation = useUpdateMasterScheduleMutation(userId)

const { state, seed, toUpdate, toScheduleUpdate } = useSystemSettings()
const { isDirty, isSaving, reset } = useDirtyForm(state, {
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

// The preferences' theme uses `auto`; the mobile appearance store uses `system`.
function toThemeMode(theme: ThemePreference): ThemeMode {
  return theme === 'auto' ? 'system' : theme
}

// Language and theme apply live (no immediate run, so the fast localStorage
// value picked at boot isn't overwritten before settings load). Discarding
// reverts `state`, which fires these watchers back to the saved values.
watch(
  () => state.value.language,
  (language) => localeStore.setLocale(language),
)
watch(
  () => state.value.theme,
  (theme) => appearance.setTheme(toThemeMode(theme)),
)

// --- Accent color -------------------------------------------------------------
// Applied live and persisted to localStorage via the appearance store (it sets
// the Ionic `--ion-color-primary*` variables). Intentionally NOT saved to the
// database yet, so it lives outside the dirty-form / "Done" save flow.
// TODO: add an `accent_color` column to master_settings and round-trip it here
// alongside the other system settings once we want it synced across devices.
const isColorModalOpen = ref(false)
const currentAccentColor = computed(
  () => appearance.presets.find((preset) => preset.key === appearance.primary)?.base,
)

// The tab's router outlet is the "presenting element" that makes the modal
// render as an iOS card (page scaled behind the sheet). See Ionic card modal
// docs: https://ionicframework.com/docs/api/modal#card-modal
const presentingElement = ref<HTMLElement | null>(null)
onMounted(() => {
  presentingElement.value = document.querySelector('ion-router-outlet')
})

function selectAccentColor(key: string) {
  appearance.setPrimary(key)
  isColorModalOpen.value = false
}

// --- Option lists -------------------------------------------------------------
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

const SLOT_STEP_VALUES = [5, 10, 15, 20, 30, 60]
const slotStepItems = computed(() =>
  SLOT_STEP_VALUES.map((value) => ({
    value,
    label: t('settings.systemRegion.slotStepMinutes', { count: value }),
  })),
)

// Live preview of how prices will look with the selected currency.
const pricePreview = computed(() => formats.price(1234.56, state.value.currency))

// --- Time zones ---------------------------------------------------------------
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

// Keep the currently saved zone selectable even if it isn't in the IANA list.
const allTimeZones = computed(() => {
  const tz = state.value.timezone
  return tz && !baseTimeZoneSet.has(tz) ? [tz, ...baseTimeZones] : baseTimeZones
})

const currentTimeZoneLabel = computed(() => timeZoneLabel(state.value.timezone))

// Time zones as picker items — the searchable card modal handles the full IANA
// set (IonSelect's action sheet is unusable at that length).
const timeZoneItems = computed(() =>
  allTimeZones.value.map((tz) => ({ value: tz, label: timeZoneLabel(tz) })),
)

// --- Picker modals (iOS card style) -------------------------------------------
// Language, currency and time zone all open a ListPickerModal card instead of a
// native select, for a consistent full-screen picking experience.
const isLanguageModalOpen = ref(false)
const isCurrencyModalOpen = ref(false)
const isTimeZoneModalOpen = ref(false)

const currentLanguageLabel = computed(
  () => LANGUAGES.find((lang) => lang.value === state.value.language)?.label ?? '',
)
const currentCurrencyLabel = computed(
  () => currencyItems.find((item) => item.value === state.value.currency)?.label ?? '',
)

function onLanguageSelected(value: string | number) {
  state.value.language = value as AppLanguage
}
function onCurrencySelected(value: string | number) {
  state.value.currency = String(value)
}
function onTimeZoneSelected(value: string | number) {
  state.value.timezone = String(value)
}

// --- Segment change handlers (Ionic segment values are strings) ---------------
function onThemeChange(value: string | number | undefined) {
  if (value === 'light' || value === 'dark' || value === 'auto') state.value.theme = value
}
function onTimeFormatChange(value: string | number | undefined) {
  state.value.timeFormat = (Number(value) === 12 ? 12 : 24) as TimeFormat
}
function onFirstDayChange(value: string | number | undefined) {
  state.value.firstDay = (Number(value) === 0 ? 0 : 1) as CalendarFirstDay
}
function onCalendarViewChange(value: string | number | undefined) {
  if (
    value === 'timeGridDay' ||
    value === 'timeGridWeek' ||
    value === 'dayGridMonth'
  ) {
    state.value.calendarView = value as MasterCalendarViewType
  }
}

// --- Save ---------------------------------------------------------------------
async function showToast(message: string, color: 'success' | 'danger') {
  const toast = await toastController.create({ message, duration: 2000, color, position: 'top' })
  await toast.present()
}

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
    // formatting, calendar) pick up the new settings without a reload.
    if (userId.value) void masterPreferencesStore.loadPreferences(userId.value)
    await showToast(t('settings.systemRegion.saveSuccess'), 'success')
  } catch {
    await showToast(t('settings.systemRegion.saveError'), 'danger')
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
        <ion-title>{{ $t('settings.systemRegion.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button strong :disabled="!isDirty || isSaving" @click="onSave">
            <ion-spinner v-if="isSaving" name="crescent" />
            <span v-else>{{ $t('common.done') }}</span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Loading skeletons -->
      <ion-list v-if="isPending" inset>
        <ion-item v-for="n in 6" :key="`skeleton-${n}`" lines="full">
          <ion-label>
            <h3><ion-skeleton-text :animated="true" style="width: 45%" /></h3>
            <p><ion-skeleton-text :animated="true" style="width: 70%" /></p>
          </ion-label>
          <ion-skeleton-text slot="end" :animated="true" style="width: 88px; height: 20px" />
        </ion-item>
      </ion-list>

      <template v-else>
        <!-- Language & theme -->
        <ion-list inset>
          <ion-list-header>
            <ion-label>{{ $t('settings.systemRegion.language') }}</ion-label>
          </ion-list-header>
          <ion-item button detail @click="isLanguageModalOpen = true">
            <ion-label>
              <p>{{ $t('settings.systemRegion.language') }}</p>
              <h3>{{ currentLanguageLabel }}</h3>
            </ion-label>
          </ion-item>
          <ion-item lines="none">
            <ion-label>
              <p>{{ $t('settings.systemRegion.theme') }}</p>
            </ion-label>
          </ion-item>
          <div class="segment-wrap">
            <ion-segment :value="state.theme" @ion-change="onThemeChange($event.detail.value)">
              <ion-segment-button value="light">
                <ion-label>{{ $t('settings.systemRegion.themeLight') }}</ion-label>
              </ion-segment-button>
              <ion-segment-button value="dark">
                <ion-label>{{ $t('settings.systemRegion.themeDark') }}</ion-label>
              </ion-segment-button>
              <ion-segment-button value="auto">
                <ion-label>{{ $t('settings.systemRegion.themeSystem') }}</ion-label>
              </ion-segment-button>
            </ion-segment>
          </div>

          <!-- Accent color -->
          <ion-item button detail lines="none" @click="isColorModalOpen = true">
            <ion-label>
              <p>{{ $t('settings.systemRegion.accentColor') }}</p>
              <h3>{{ $t(`appearance.colors.${appearance.primary}`) }}</h3>
            </ion-label>
            <span slot="end" class="color-dot" :style="{ backgroundColor: currentAccentColor }" />
          </ion-item>
        </ion-list>

        <!-- Currency & formats -->
        <ion-list inset>
          <ion-list-header>
            <ion-label>{{ $t('settings.systemRegion.currency') }}</ion-label>
          </ion-list-header>
          <ion-item button detail @click="isCurrencyModalOpen = true">
            <ion-label>
              <p>{{ $t('settings.systemRegion.currency') }}</p>
              <h3>{{ currentCurrencyLabel }}</h3>
            </ion-label>
            <ion-note slot="end" class="price-preview">{{ pricePreview }}</ion-note>
          </ion-item>

          <ion-item>
            <ion-select
              v-model="state.dateFormat"
              interface="popover"
              :label="$t('settings.systemRegion.dateFormat')"
              label-placement="stacked"
            >
              <ion-select-option
                v-for="item in dateFormatItems"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item lines="none">
            <ion-label>
              <p>{{ $t('settings.systemRegion.timeFormat') }}</p>
            </ion-label>
          </ion-item>
          <div class="segment-wrap">
            <ion-segment
              :value="String(state.timeFormat)"
              @ion-change="onTimeFormatChange($event.detail.value)"
            >
              <ion-segment-button value="12">
                <ion-label>{{ $t('settings.systemRegion.timeFormat12') }}</ion-label>
              </ion-segment-button>
              <ion-segment-button value="24">
                <ion-label>{{ $t('settings.systemRegion.timeFormat24') }}</ion-label>
              </ion-segment-button>
            </ion-segment>
          </div>
        </ion-list>

        <!-- Calendar -->
        <ion-list inset>
          <ion-list-header>
            <ion-label>{{ $t('settings.systemRegion.timeZone') }}</ion-label>
          </ion-list-header>
          <ion-item button detail @click="isTimeZoneModalOpen = true">
            <ion-label>
              <p>{{ $t('settings.systemRegion.timeZone') }}</p>
              <h3>{{ currentTimeZoneLabel }}</h3>
            </ion-label>
          </ion-item>

          <ion-item lines="none">
            <ion-label>
              <p>{{ $t('settings.systemRegion.firstDay') }}</p>
            </ion-label>
          </ion-item>
          <div class="segment-wrap">
            <ion-segment
              :value="String(state.firstDay)"
              @ion-change="onFirstDayChange($event.detail.value)"
            >
              <ion-segment-button value="1">
                <ion-label>{{ $t('settings.systemRegion.firstDayMonday') }}</ion-label>
              </ion-segment-button>
              <ion-segment-button value="0">
                <ion-label>{{ $t('settings.systemRegion.firstDaySunday') }}</ion-label>
              </ion-segment-button>
            </ion-segment>
          </div>

          <ion-item lines="none">
            <ion-label>
              <p>{{ $t('settings.systemRegion.calendarView') }}</p>
            </ion-label>
          </ion-item>
          <div class="segment-wrap">
            <ion-segment
              :value="state.calendarView"
              @ion-change="onCalendarViewChange($event.detail.value)"
            >
              <ion-segment-button value="timeGridDay">
                <ion-label>{{ $t('settings.systemRegion.calendarViewDay') }}</ion-label>
              </ion-segment-button>
              <ion-segment-button value="timeGridWeek">
                <ion-label>{{ $t('settings.systemRegion.calendarViewWeek') }}</ion-label>
              </ion-segment-button>
              <ion-segment-button value="dayGridMonth">
                <ion-label>{{ $t('settings.systemRegion.calendarViewMonth') }}</ion-label>
              </ion-segment-button>
            </ion-segment>
          </div>

          <ion-item>
            <ion-select
              v-model="state.slotStepMinutes"
              interface="popover"
              :label="$t('settings.systemRegion.slotStep')"
              label-placement="stacked"
            >
              <ion-select-option
                v-for="item in slotStepItems"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>
      </template>

      <!-- Language / currency / time zone pickers (iOS card modals) -->
      <list-picker-modal
        v-model:is-open="isLanguageModalOpen"
        :title="$t('settings.systemRegion.language')"
        :items="LANGUAGES"
        :model-value="state.language"
        :presenting-element="presentingElement"
        @update:model-value="onLanguageSelected"
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
        v-model:is-open="isTimeZoneModalOpen"
        :title="$t('settings.systemRegion.timeZone')"
        :items="timeZoneItems"
        :model-value="state.timezone"
        searchable
        :presenting-element="presentingElement"
        @update:model-value="onTimeZoneSelected"
      />

      <!-- Accent color picker (iOS card modal) -->
      <ion-modal
        :is-open="isColorModalOpen"
        :presenting-element="presentingElement ?? undefined"
        @did-dismiss="isColorModalOpen = false"
      >
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button @click="isColorModalOpen = false">{{ $t('common.done') }}</ion-button>
            </ion-buttons>
            <ion-title>{{ $t('settings.systemRegion.accentColor') }}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <ion-list inset>
            <ion-item
              v-for="preset in appearance.presets"
              :key="preset.key"
              button
              :detail="false"
              @click="selectAccentColor(preset.key)"
            >
              <span slot="start" class="color-dot" :style="{ backgroundColor: preset.base }" />
              <ion-label>{{ $t(`appearance.colors.${preset.key}`) }}</ion-label>
              <ion-icon
                v-if="preset.key === appearance.primary"
                slot="end"
                :icon="checkmark"
                color="primary"
                aria-hidden="true"
              />
            </ion-item>
          </ion-list>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.segment-wrap {
  padding: 4px 12px 12px;
}

.price-preview {
  font-weight: 600;
}

.color-dot {
  display: inline-block;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
}
</style>
