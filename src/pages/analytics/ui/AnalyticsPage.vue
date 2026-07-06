<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AnalyticsPeriodV2 } from '@entities/analytics'
import { useAnalyticsQueryV2 } from '@entities/analytics'
import {
  AnalyticsToolbar,
  AnalyticsStatCards,
  AnalyticsRevenueChart,
  AnalyticsClientMix,
  AnalyticsBusiestDays,
  AnalyticsTopServices,
} from '@widgets/analytics'

const { t } = useI18n()
const period = ref<AnalyticsPeriodV2>('this_month')
const compare = ref(false)
const { data, isPending, isPlaceholderData } = useAnalyticsQueryV2(period)

const EMPTY_MIX = { new: 0, returning: 0, total: 0 }
const EMPTY_DAYS = [0, 0, 0, 0, 0, 0, 0]

const periodLabel = computed(() =>
  typeof period.value === 'string'
    ? t(
        `analytics.period.${period.value === 'this_week' ? 'thisWeek' : period.value === 'last_week' ? 'lastWeek' : period.value === 'this_month' ? 'thisMonth' : period.value === 'last_month' ? 'lastMonth' : 'today'}`,
      )
    : t('analytics.period.custom'),
)

/** What the current period is compared against, e.g. "vs last month". */
const COMPARE_KEYS: Record<string, string> = {
  today: 'yesterday',
  this_week: 'lastWeek',
  last_week: 'prevWeek',
  this_month: 'lastMonth',
  last_month: 'prevMonth',
}
const compareLabel = computed(() =>
  t(
    `analytics.compareVs.${typeof period.value === 'string' ? COMPARE_KEYS[period.value] : 'prevPeriod'}`,
  ),
)
</script>

<template>
  <UPage :ui="{ root: 'px-12 max-w-7xl mx-auto' }" as="main">
    <UPageHeader
      :title="t('analytics.title')"
      :description="t('analytics.description')"
      :ui="{ root: 'border-none' }"
    />
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
            :compare="compare"
            :loading="isPending"
          />
          <div class="grid gap-6 lg:grid-cols-2">
            <AnalyticsTopServices :services="data?.top_services ?? []" :loading="isPending" />
            <div class="space-y-6">
              <AnalyticsClientMix :mix="data?.client_mix ?? EMPTY_MIX" :loading="isPending" />
              <AnalyticsBusiestDays
                :days="data?.busiest_days ?? EMPTY_DAYS"
                :peak-from="data?.peak_hour_from ?? null"
                :peak-to="data?.peak_hour_to ?? null"
                :loading="isPending"
              />
            </div>
          </div>
        </div>
      </div>
    </UPageBody>
  </UPage>
</template>
