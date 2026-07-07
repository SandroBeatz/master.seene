<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getLocalTimeZone, today } from '@internationalized/date'
import type { TabsItem } from '@nuxt/ui'
import type { AnalyticsPeriodV2 } from '@entities/analytics'
import { useAnalyticsQueryV2 } from '@entities/analytics'
import { useFormats } from '@shared/lib/formats'
import { Typography } from '@shared/ui'

const { t } = useI18n()
const formats = useFormats()

type PeriodKey = 'day' | 'week' | 'month'

const activeTab = ref<PeriodKey>('day')

// Home always shows the current day/week/month — anchor the period at today.
const anchor = today(getLocalTimeZone())
const anchorISO = `${anchor.year}-${String(anchor.month).padStart(2, '0')}-${String(anchor.day).padStart(2, '0')}`

const periodToAnalytics: Record<PeriodKey, AnalyticsPeriodV2> = {
  day: { kind: 'day', date: anchorISO },
  week: { kind: 'week', date: anchorISO },
  month: { kind: 'month', date: anchorISO },
}

const analyticsPeriod = computed(() => periodToAnalytics[activeTab.value])
const { data, isPending } = useAnalyticsQueryV2(analyticsPeriod)

// Home shows three headline metrics from the current-period block.
const metrics = computed(() => data.value?.current)

const periods = computed<TabsItem[]>(() => [
  { label: t('home.overview.period.day'), value: 'day' },
  { label: t('home.overview.period.week'), value: 'week' },
  { label: t('home.overview.period.month'), value: 'month' },
])

const periodSubtext = computed(() => {
  const p = activeTab.value
  const sub = (day: string, week: string, month: string) =>
    p === 'day' ? day : p === 'week' ? week : month
  return {
    earned: sub(
      t('home.overview.subtext.today'),
      t('home.overview.subtext.thisWeek'),
      t('home.overview.subtext.thisMonth'),
    ),
    appointments: sub(
      t('home.overview.subtext.today'),
      t('home.overview.subtext.thisWeek'),
      t('home.overview.subtext.thisMonth'),
    ),
    hours: sub(
      t('home.overview.subtext.bookedToday'),
      t('home.overview.subtext.bookedThisWeek'),
      t('home.overview.subtext.bookedThisMonth'),
    ),
  }
})

const hoursLabel = computed(() => {
  const minutes = metrics.value?.working_minutes
  if (minutes === undefined) return '—'
  if (minutes === 0) return `0${t('analytics.hoursUnit')}`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h}${t('analytics.hoursUnit')}`
  return `${h}${t('analytics.hoursUnit')} ${m}${t('analytics.minutesUnit')}`
})

const overviewCards = computed(() => [
  {
    key: 'earned',
    icon: 'i-lucide-banknote',
    iconClass: 'text-green-600 dark:text-green-400',
    iconBgClass: 'bg-green-100 dark:bg-green-900/30',
    label: t('home.overview.earnedToday'),
    value: formats.price(metrics.value?.earned ?? 0),
    skeletonClass: 'w-24',
    subtext: periodSubtext.value.earned,
  },
  {
    key: 'appointments',
    icon: 'i-lucide-calendar-check',
    iconClass: 'text-violet-600 dark:text-violet-400',
    iconBgClass: 'bg-violet-100 dark:bg-violet-900/30',
    label: t('home.overview.appointments'),
    value: String(metrics.value?.appointments_count ?? 0),
    skeletonClass: 'w-16',
    subtext: periodSubtext.value.appointments,
  },
  {
    key: 'hours',
    icon: 'i-lucide-clock',
    iconClass: 'text-amber-600 dark:text-amber-400',
    iconBgClass: 'bg-amber-100 dark:bg-amber-900/30',
    label: t('home.overview.workingHours'),
    value: hoursLabel.value,
    skeletonClass: 'w-20',
    subtext: periodSubtext.value.hours,
  },
])

// Nuxt UI overrides
const hostUI = {
  root: 'rounded-xl shadow-panel ring-0 divide-y-0',
  header: 'pb-0',
}
const cardUI = {
  root: 'h-full rounded-xl shadow-none',
}
const tabsUI = {
  root: 'w-full sm:w-auto',
  list: 'rounded-full bg-zinc-100 p-1 dark:bg-zinc-800',
  indicator: 'rounded-full bg-default shadow-sm',
  trigger:
    'cursor-pointer rounded-full px-5 py-2 data-[state=active]:text-highlighted data-[state=inactive]:text-muted',
}
</script>

<template>
  <UCard :ui="hostUI">
    <template #header>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Typography variant="h5" class="text-highlighted font-bold">{{
          t('home.overview.title')
        }}</Typography>
        <UTabs
          v-model="activeTab"
          variant="pill"
          color="neutral"
          size="sm"
          :content="false"
          :items="periods"
          :ui="tabsUI"
        />
      </div>
    </template>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <UCard v-for="card in overviewCards" :key="card.key" :ui="cardUI">
        <div class="flex items-center gap-4">
          <div
            class="flex size-16 shrink-0 items-center justify-center rounded-lg"
            :class="card.iconBgClass"
          >
            <UIcon :name="card.icon" class="size-6" :class="card.iconClass" />
          </div>
          <div class="min-w-0">
            <Typography variant="endnote" class="font-semibold uppercase tracking-wider text-muted">
              {{ card.label }}
            </Typography>

            <USkeleton v-if="isPending" class="h-7" :class="card.skeletonClass" />
            <Typography v-else variant="h4" class="text-highlighted font-bold">
              {{ card.value }}
            </Typography>

            <Typography variant="footnote" class="text-muted">
              {{ card.subtext }}
            </Typography>
          </div>
        </div>
      </UCard>
    </div>
  </UCard>
</template>
