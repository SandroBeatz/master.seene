<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDate, DateFormatter, getLocalTimeZone, today } from '@internationalized/date'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
} from '@ionic/vue'
import {
  chevronBack,
  chevronDown,
  chevronForward,
  alertCircleOutline,
  ellipsisHorizontal,
} from 'ionicons/icons'
import type {
  AnalyticsAnchoredKind,
  AnalyticsPeriodKind,
  AnalyticsPeriodV2,
} from '@entities/analytics'
import { useAnalyticsQueryV2, useAnalyticsWidgetsQueryV2 } from '@entities/analytics'
import { useFormats } from '@shared/lib/formats'
// Pure calendar helpers behind the desktop toolbar — no Nuxt UI, reused as-is.
import {
  canStepForward as canStepForwardFrom,
  currentPeriod,
  isCurrentPeriod,
  previousRange,
  resolveRange,
  stepPeriod,
  type DateRange,
} from '@widgets/analytics/model/period-step'
import AnalyticsStatCardsMobile from './AnalyticsStatCardsMobile.vue'
import AnalyticsRevenueCardMobile from './AnalyticsRevenueCardMobile.vue'
import AnalyticsTopServicesMobile from './AnalyticsTopServicesMobile.vue'
import AnalyticsClientMixMobile from './AnalyticsClientMixMobile.vue'
import AnalyticsBusiestDaysMobile from './AnalyticsBusiestDaysMobile.vue'
import AnalyticsOptionsSheetMobile from './AnalyticsOptionsSheetMobile.vue'
import AnalyticsPeriodPickerMobile from './AnalyticsPeriodPickerMobile.vue'

const { t, locale } = useI18n()
const formats = useFormats()
const tz = getLocalTimeZone()

// The last selected period survives reloads — same storage key/shape the desktop
// analytics uses. Custom ranges aren't pickable on mobile yet, so a stored custom
// value falls back to the default month (see the deferred custom-range task).
const PERIOD_STORAGE_KEY = 'analytics:period'
const ANCHORED_KINDS: readonly AnalyticsAnchoredKind[] = ['day', 'week', 'month', 'year']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function todayISO(): string {
  const t0 = today(tz)
  return `${t0.year}-${String(t0.month).padStart(2, '0')}-${String(t0.day).padStart(2, '0')}`
}

function defaultPeriod(): AnalyticsPeriodV2 {
  return { kind: 'month', date: todayISO() }
}

function loadStoredPeriod(): AnalyticsPeriodV2 {
  try {
    const raw = localStorage.getItem(PERIOD_STORAGE_KEY)
    if (!raw) return defaultPeriod()
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || !('kind' in parsed)) return defaultPeriod()
    const kind = (parsed as { kind: unknown }).kind
    if (typeof kind === 'string' && (ANCHORED_KINDS as readonly string[]).includes(kind)) {
      const date = (parsed as { date?: unknown }).date
      if (typeof date === 'string' && ISO_DATE.test(date)) {
        return { kind: kind as AnalyticsAnchoredKind, date } as AnalyticsPeriodV2
      }
    }
  } catch {
    // corrupted / unavailable storage — fall back to the default below
  }
  return defaultPeriod()
}

const period = ref<AnalyticsPeriodV2>(loadStoredPeriod())
watch(period, (value) => {
  try {
    localStorage.setItem(PERIOD_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // storage unavailable (private mode) — selection just won't persist
  }
})

const compare = ref(false)

const { data, isPending, isPlaceholderData, error, refetch } = useAnalyticsQueryV2(period)
// Fixed rolling windows — independent of the period filter above.
const {
  data: widgets,
  isPending: widgetsPending,
  error: widgetsError,
  refetch: refetchWidgets,
} = useAnalyticsWidgetsQueryV2()

const EMPTY_MIX = { new: 0, returning: 0, total: 0 }
const EMPTY_DAYS = [0, 0, 0, 0, 0, 0, 0]

// Only the very first load (no data yet) blocks the screen with the error state;
// a failed background refetch keeps the last data on screen.
const showError = computed(
  () => (!!error.value && !data.value) || (!!widgetsError.value && !widgets.value),
)

function retry() {
  void refetch()
  void refetchWidgets()
}

// --- Options sheet ("⋯"): granularity + compare toggle ----------------------
const isOptionsOpen = ref(false)
// Custom ranges aren't pickable on mobile (see loadStoredPeriod), so the period
// is always anchored here.
const anchoredKind = computed(() => period.value.kind as AnalyticsAnchoredKind)
const anchorDate = computed(() => ('date' in period.value ? period.value.date : todayISO()))

/** Choosing a granularity jumps to its current period. */
function selectKind(kind: AnalyticsAnchoredKind) {
  if (kind !== period.value.kind) period.value = currentPeriod(kind)
}

// --- Calendar sheet behind the caption: jump to any past period -------------
const isPickerOpen = ref(false)

function selectDate(date: string) {
  period.value = { kind: anchoredKind.value, date } as AnalyticsPeriodV2
}

// --- Prev / next stepping + "jump to current" -------------------------------
function step(dir: 1 | -1) {
  period.value = stepPeriod(period.value, dir)
}
const canStepForward = computed(() => canStepForwardFrom(period.value))
const showJump = computed(() => !isCurrentPeriod(period.value))

const JUMP_KEYS: Record<AnalyticsAnchoredKind, string> = {
  day: 'analytics.period.today',
  week: 'analytics.period.thisWeek',
  month: 'analytics.period.thisMonth',
  year: 'analytics.period.thisYear',
}
const jumpLabel = computed(() => t(JUMP_KEYS[anchoredKind.value]))
function jumpToCurrent() {
  period.value = currentPeriod(period.value.kind)
}

// --- Centre caption ("June 2026", "Mon 7 – Sun 13", …) ----------------------
function fmtDay(d: CalendarDate): string {
  const opts: Intl.DateTimeFormatOptions =
    d.year === today(tz).year
      ? { day: 'numeric', month: 'short' }
      : { day: 'numeric', month: 'short', year: 'numeric' }
  return new DateFormatter(locale.value, opts).format(d.toDate(tz))
}
function fmtByKind(r: DateRange): string {
  switch (period.value.kind) {
    case 'day':
      return formats.dateDay(r.start.toDate(tz))
    case 'month':
      return new DateFormatter(locale.value, { month: 'long', year: 'numeric' }).format(
        r.start.toDate(tz),
      )
    case 'year':
      return String(r.start.year)
    default: // week → a date range
      return `${fmtDay(r.start)} – ${fmtDay(r.end)}`
  }
}
const centerLabel = computed(() => fmtByKind(resolveRange(period.value)))
const compareCaption = computed(() => fmtByKind(previousRange(period.value)))

// --- Captions passed to child blocks ----------------------------------------
const periodLabel = computed(() => t(`analytics.period.${period.value.kind}`))
const COMPARE_KEYS: Record<AnalyticsPeriodKind, string> = {
  day: 'yesterday',
  week: 'lastWeek',
  month: 'lastMonth',
  year: 'lastYear',
  custom: 'prevPeriod',
}
const compareLabel = computed(() => t(`analytics.compareVs.${COMPARE_KEYS[period.value.kind]}`))
</script>

<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>{{ $t('analytics.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button v-if="showJump" size="small" @click="jumpToCurrent">
            {{ jumpLabel }}
          </ion-button>
          <ion-button
            class="options-button"
            fill="clear"
            color="dark"
            shape="round"
            :aria-label="$t('analytics.options.title')"
            @click="isOptionsOpen = true"
          >
            <ion-icon slot="icon-only" :icon="ellipsisHorizontal" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Error (first load only) -->
      <div v-if="showError" class="state">
        <ion-icon :icon="alertCircleOutline" class="state-icon" color="danger" />
        <p class="state-text">{{ $t('analytics.loadError') }}</p>
        <ion-button fill="outline" size="small" @click="retry">{{
          $t('analytics.retry')
        }}</ion-button>
      </div>

      <div v-else class="page">
        <!-- Period stepper; the caption opens the calendar for the granularity -->
        <div class="stepper">
          <ion-button
            fill="clear"
            :aria-label="$t('analytics.toolbar.prevPeriod')"
            @click="step(-1)"
          >
            <ion-icon slot="icon-only" :icon="chevronBack" />
          </ion-button>
          <button
            type="button"
            class="caption"
            :aria-label="$t('analytics.period.title')"
            @click="isPickerOpen = true"
          >
            <span class="caption-main">
              {{ centerLabel }}
              <ion-icon :icon="chevronDown" class="caption-chevron" aria-hidden="true" />
            </span>
            <span v-if="compare" class="caption-sub">{{ compareCaption }}</span>
          </button>
          <ion-button
            fill="clear"
            :disabled="!canStepForward"
            :aria-label="$t('analytics.toolbar.nextPeriod')"
            @click="step(1)"
          >
            <ion-icon slot="icon-only" :icon="chevronForward" />
          </ion-button>
        </div>

        <!-- Period-driven blocks: dimmed while a new period loads. -->
        <div class="blocks" :class="{ dimmed: isPlaceholderData }" :aria-busy="isPlaceholderData">
          <analytics-stat-cards-mobile
            :data="data"
            :loading="isPending"
            :compare="compare"
            :compare-label="compareLabel"
          />
          <analytics-revenue-card-mobile
            :series="data?.revenue_series ?? []"
            :earned="data?.current.earned ?? 0"
            :period-label="periodLabel"
            :period-kind="period.kind"
            :compare="compare"
            :loading="isPending"
          />
        </div>

        <!-- Fixed-window widgets: unaffected by the period filter. -->
        <analytics-top-services-mobile
          :services="widgets?.top_services ?? []"
          :loading="widgetsPending"
        />
        <analytics-client-mix-mobile
          :mix="widgets?.client_mix ?? EMPTY_MIX"
          :loading="widgetsPending"
        />
        <analytics-busiest-days-mobile
          :days="widgets?.busiest_days ?? EMPTY_DAYS"
          :peak-from="widgets?.peak_hour_from ?? null"
          :peak-to="widgets?.peak_hour_to ?? null"
          :loading="widgetsPending"
        />
      </div>
    </ion-content>

    <analytics-options-sheet-mobile
      v-model:is-open="isOptionsOpen"
      v-model:compare="compare"
      :kind="anchoredKind"
      @select="selectKind"
    />
    <analytics-period-picker-mobile
      v-model:is-open="isPickerOpen"
      :kind="anchoredKind"
      :date="anchorDate"
      @select="selectDate"
    />
  </ion-page>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  /* Keep the last card clear of the home indicator / tab bar. */
  padding-bottom: calc(14px + var(--safe-area-bottom, 0px));
}

.stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.caption {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  align-items: center;
  padding: 6px 8px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: center;
  -webkit-tap-highlight-color: transparent;
}

.caption:active {
  background: var(--se-surface-card);
}

.caption-main {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.caption-chevron {
  flex-shrink: 0;
  color: var(--ion-color-medium);
  font-size: 14px;
}

.caption-sub {
  font-size: 0.75rem;
  color: var(--ion-color-medium);
}

ion-header ion-toolbar {
  --background: var(--se-surface-page, var(--ion-background-color));
}

/* Both modes: on MD the title is left-aligned and Tailwind's preflight resets
   ion-title's own 20px inset, so the toolbar padding is the only gutter. */
ion-header ion-toolbar {
  --padding-start: 16px;
  --padding-end: 16px;
}

.options-button {
  width: 34px;
  height: 34px;
  margin: 0;
  --padding-start: 0;
  --padding-end: 0;
  --border-radius: 50%;
}

.blocks {
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: opacity 0.2s ease;
}

.dimmed {
  opacity: 0.5;
  pointer-events: none;
}

.state {
  display: flex;
  min-height: 60vh;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  text-align: center;
}

.state-icon {
  font-size: 44px;
}

.state-text {
  color: var(--ion-color-medium);
}
</style>
