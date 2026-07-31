<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import type {
  AnalyticsAnchoredKind,
  AnalyticsPeriodKind,
  AnalyticsPeriodV2,
} from '@entities/analytics'
import { useAnalyticsQueryV2, useAnalyticsWidgetsQueryV2 } from '@entities/analytics'
import {
  AnalyticsToolbar,
  AnalyticsStatCards,
  AnalyticsRevenueChart,
  AnalyticsClientMix,
  AnalyticsBusiestDays,
  AnalyticsTopServices,
} from '@widgets/analytics'
import { Page, OptionsDrawer, type OptionsDrawerItem } from '@shared/ui'

const { t } = useI18n()
// The last selected period survives page reloads.
const PERIOD_STORAGE_KEY = 'analytics:period'
const ANCHORED_KINDS: readonly AnalyticsAnchoredKind[] = ['day', 'week', 'month', 'year']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Local calendar date as 'YYYY-MM-DD' — the anchor for the default period. */
function todayISO(): string {
  const t0 = today(getLocalTimeZone())
  return `${t0.year}-${String(t0.month).padStart(2, '0')}-${String(t0.day).padStart(2, '0')}`
}

/** Default: the current month. */
function defaultPeriod(): AnalyticsPeriodV2 {
  return { kind: 'month', date: todayISO() }
}

function loadStoredPeriod(): AnalyticsPeriodV2 {
  try {
    const raw = localStorage.getItem(PERIOD_STORAGE_KEY)
    if (!raw) return defaultPeriod()
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || !('kind' in parsed)) {
      // legacy string presets or corrupted value — fall back to the default
      return defaultPeriod()
    }
    const kind = (parsed as { kind: unknown }).kind
    if (kind === 'custom') {
      const range = (parsed as { range?: { from?: unknown; to?: unknown } }).range
      if (
        range &&
        typeof range.from === 'string' &&
        typeof range.to === 'string' &&
        ISO_DATE.test(range.from) &&
        ISO_DATE.test(range.to)
      ) {
        return { kind: 'custom', range: { from: range.from, to: range.to } }
      }
      return defaultPeriod()
    }
    if (typeof kind === 'string' && (ANCHORED_KINDS as readonly string[]).includes(kind)) {
      const date = (parsed as { date?: unknown }).date
      if (typeof date === 'string' && ISO_DATE.test(date)) {
        return { kind: kind as AnalyticsAnchoredKind, date } as AnalyticsPeriodV2
      }
    }
  } catch {
    // corrupted value — fall back to the default below
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
const { data, isPending, isPlaceholderData } = useAnalyticsQueryV2(period)
// Fixed rolling windows — independent of the period filter above.
const { data: widgets, isPending: widgetsPending } = useAnalyticsWidgetsQueryV2()

const EMPTY_MIX = { new: 0, returning: 0, total: 0 }
const EMPTY_DAYS = [0, 0, 0, 0, 0, 0, 0]

/** Granularity caption under the revenue total, e.g. "Month". */
const periodLabel = computed(() => t(`analytics.period.${period.value.kind}`))

/** What the current period is compared against, e.g. "vs last month". */
const COMPARE_KEYS: Record<AnalyticsPeriodKind, string> = {
  day: 'yesterday',
  week: 'lastWeek',
  month: 'lastMonth',
  year: 'lastYear',
  custom: 'prevPeriod',
}
const compareLabel = computed(() => t(`analytics.compareVs.${COMPARE_KEYS[period.value.kind]}`))

// --- Mobile options / period picker -----------------------------------------
// On mobile the granularity <USelect> and compare toggle in the toolbar are
// hidden; instead a "⋯" button next to the page title opens an OptionsDrawer.
// From there "Period" opens a small centered modal and "Compare" flips the
// compare switch. The desktop toolbar keeps its own controls, so the two paths
// never show at once.
const tz = getLocalTimeZone()
const isOptionsDrawerOpen = ref(false)
const isPeriodModalOpen = ref(false)
const isCustomOpen = ref(false)

const PERIOD_KINDS: readonly AnalyticsPeriodKind[] = ['day', 'week', 'month', 'year', 'custom']
const kindItems = computed(() =>
  PERIOD_KINDS.map((value) => ({ value, label: t(`analytics.period.${value}`) })),
)
/** Label shown on the mobile pill button — the active granularity. */
const activePeriodLabel = computed(() => t(`analytics.period.${period.value.kind}`))

/** 'YYYY-MM-DD' → CalendarDate for seeding the custom-range calendar. */
function toCalendarDate(value: string): CalendarDate {
  const parts = value.split('-')
  return new CalendarDate(Number(parts[0]), Number(parts[1]), Number(parts[2]))
}
function fromCalendarDate(d: CalendarDate): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

/** Analytics only looks at the past — the calendar stops at today. */
const maxDate = today(tz)
const customDraft = shallowRef<{ start: CalendarDate | undefined; end: CalendarDate | undefined }>({
  start: undefined,
  end: undefined,
})

/** Pick a granularity: anchored kinds jump to their current period; custom opens the calendar. */
function selectKind(kind: AnalyticsPeriodKind) {
  if (kind === 'custom') {
    if (period.value.kind === 'custom') {
      customDraft.value = {
        start: toCalendarDate(period.value.range.from),
        end: toCalendarDate(period.value.range.to),
      }
    } else {
      const t0 = today(tz)
      customDraft.value = { start: t0.subtract({ days: 6 }), end: t0 }
    }
    isPeriodModalOpen.value = false
    isCustomOpen.value = true
    return
  }
  period.value = { kind, date: todayISO() } as AnalyticsPeriodV2
  isPeriodModalOpen.value = false
}

function applyCustom() {
  const { start, end } = customDraft.value
  if (!start || !end) return
  period.value = {
    kind: 'custom',
    range: { from: fromCalendarDate(start), to: fromCalendarDate(end) },
  }
  isCustomOpen.value = false
}

// Rows shown in the mobile OptionsDrawer opened from the "⋯" header button.
const optionItems = computed<OptionsDrawerItem[]>(() => [
  {
    id: 'period',
    icon: 'i-lucide-calendar-range',
    iconColor: 'primary',
    label: t('analytics.period.title'),
    description: activePeriodLabel.value,
  },
  {
    id: 'compare',
    icon: 'i-lucide-git-compare-arrows',
    iconColor: 'info',
    label: t('analytics.toolbar.compare'),
    type: 'switch',
    checked: compare.value,
  },
])

function onOptionSelect(item: OptionsDrawerItem) {
  if (item.id === 'period') isPeriodModalOpen.value = true
}

function onOptionToggle(item: OptionsDrawerItem, checked: boolean) {
  if (item.id === 'compare') compare.value = checked
}
</script>

<template>
  <Page :title="t('analytics.title')">
    <template #header-right>
      <!-- Mobile-only options menu; the desktop controls live in the toolbar. -->
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-ellipsis-vertical"
        :aria-label="t('analytics.options.title')"
        class="shrink-0 rounded-full md:hidden"
        @click="isOptionsDrawerOpen = true"
      />
    </template>

    <div class="space-y-4 md:space-y-6">
      <AnalyticsToolbar v-model="period" v-model:compare="compare" />
      <!-- While a new period loads, previous data stays visible but dimmed. -->
      <div
        class="space-y-4 transition-opacity duration-200 md:space-y-6"
        :class="{ 'pointer-events-none opacity-50': isPlaceholderData }"
        :aria-busy="isPlaceholderData"
      >
        <AnalyticsStatCards
          :data="data"
          :loading="isPending"
          :compare="compare"
          :compare-label="compareLabel"
        />
        <AnalyticsRevenueChart
          :series="data?.revenue_series ?? []"
          :earned="data?.current.earned ?? 0"
          :period-label="periodLabel"
          :period-kind="period.kind"
          :compare="compare"
          :loading="isPending"
        />
      </div>

      <!-- Fixed-window widgets: unaffected by the period filter, so they sit
         outside the dimming wrapper and never refetch on period switch. -->
      <div class="grid gap-4 md:gap-6 lg:grid-cols-2">
        <AnalyticsTopServices :services="widgets?.top_services ?? []" :loading="widgetsPending" />
        <div class="space-y-4 md:space-y-6">
          <AnalyticsClientMix :mix="widgets?.client_mix ?? EMPTY_MIX" :loading="widgetsPending" />
          <AnalyticsBusiestDays
            :days="widgets?.busiest_days ?? EMPTY_DAYS"
            :peak-from="widgets?.peak_hour_from ?? null"
            :peak-to="widgets?.peak_hour_to ?? null"
            :loading="widgetsPending"
          />
        </div>
      </div>
    </div>

    <!-- Mobile options drawer (opened from the "⋯" header button) -->
    <OptionsDrawer
      v-model:open="isOptionsDrawerOpen"
      :title="t('analytics.options.title')"
      :items="optionItems"
      @select="onOptionSelect"
      @toggle="onOptionToggle"
    />

    <!-- Mobile granularity picker (opened from the drawer's "Period" option) -->
    <UModal v-model:open="isPeriodModalOpen" :title="t('analytics.period.title')">
      <template #body>
        <div class="space-y-2">
          <UButton
            v-for="item in kindItems"
            :key="item.value"
            :color="item.value === period.kind ? 'primary' : 'neutral'"
            :variant="item.value === period.kind ? 'soft' : 'ghost'"
            size="lg"
            block
            class="justify-start"
            @click="selectKind(item.value)"
          >
            {{ item.label }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Custom range picker (opened from the drawer's "Custom" option) -->
    <UModal v-model:open="isCustomOpen" :title="t('analytics.period.custom')">
      <template #body>
        <UCalendar v-model="customDraft" range :max-value="maxDate" />
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" size="sm" @click="isCustomOpen = false">
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            color="primary"
            size="sm"
            :disabled="!customDraft.start || !customDraft.end"
            @click="applyCustom"
          >
            {{ t('analytics.toolbar.apply') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </Page>
</template>
