<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getLocalTimeZone, today } from '@internationalized/date'
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
</script>

<template>
  <UTheme
    :ui="{
      page: { root: 'px-4 sm:px-6 lg:px-12 py-3 w-full max-w-7xl mx-auto' },
      pageHeader: { root: 'border-none pb-2' },
    }"
  >
    <UPage as="main">
      <UPageHeader :title="t('analytics.title')" :description="t('analytics.description')" />
      <UPageBody>
        <div class="space-y-6">
          <AnalyticsToolbar v-model="period" v-model:compare="compare" />
          <!-- While a new period loads, previous data stays visible but dimmed. -->
          <div
            class="space-y-6 transition-opacity duration-200"
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
          <div class="grid gap-6 lg:grid-cols-2">
            <AnalyticsTopServices
              :services="widgets?.top_services ?? []"
              :loading="widgetsPending"
            />
            <div class="space-y-6">
              <AnalyticsClientMix
                :mix="widgets?.client_mix ?? EMPTY_MIX"
                :loading="widgetsPending"
              />
              <AnalyticsBusiestDays
                :days="widgets?.busiest_days ?? EMPTY_DAYS"
                :peak-from="widgets?.peak_hour_from ?? null"
                :peak-to="widgets?.peak_hour_to ?? null"
                :loading="widgetsPending"
              />
            </div>
          </div>
        </div>
      </UPageBody>
    </UPage>
  </UTheme>
</template>
