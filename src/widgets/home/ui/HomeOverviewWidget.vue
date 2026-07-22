<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getLocalTimeZone, today } from '@internationalized/date'
import type { AnalyticsPeriodV2 } from '@entities/analytics'
import { useAnalyticsQueryV2 } from '@entities/analytics'
import { useFormats } from '@shared/lib/formats'
import { AnimatedNumber, Typography } from '@shared/ui'

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

const periods = computed(() => [
  { label: t('home.overview.period.day'), value: 'day' as const },
  { label: t('home.overview.period.week'), value: 'week' as const },
  { label: t('home.overview.period.month'), value: 'month' as const },
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

// NBSP between amount and symbol, mirroring useFormats().price exactly.
const currency = computed(() => formats.currency())

const workingHoursParts = computed(() => {
  const minutes = metrics.value?.working_minutes ?? 0
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 }
})

const overviewCards = computed(() => [
  {
    key: 'earned' as const,
    kind: 'money' as const,
    icon: 'i-lucide-banknote',
    iconClass: 'text-green-600 dark:text-green-400',
    iconBgClass: 'bg-green-100 dark:bg-green-900/30',
    label: t('home.overview.earnedToday'),
    numberValue: metrics.value?.earned ?? 0,
    numberFormat: {
      minimumFractionDigits: currency.value.decimals,
      maximumFractionDigits: currency.value.decimals,
    },
    prefix: currency.value.position === 'prefix' ? `${currency.value.symbol} ` : undefined,
    suffix: currency.value.position === 'suffix' ? ` ${currency.value.symbol}` : undefined,
    skeletonClass: 'w-24',
    subtext: periodSubtext.value.earned,
  },
  {
    key: 'appointments' as const,
    kind: 'count' as const,
    icon: 'i-lucide-calendar-check',
    iconClass: 'text-violet-600 dark:text-violet-400',
    iconBgClass: 'bg-violet-100 dark:bg-violet-900/30',
    label: t('home.overview.appointments'),
    numberValue: metrics.value?.appointments_count ?? 0,
    skeletonClass: 'w-16',
    subtext: periodSubtext.value.appointments,
  },
  {
    key: 'hours' as const,
    kind: 'duration' as const,
    icon: 'i-lucide-clock',
    iconClass: 'text-amber-600 dark:text-amber-400',
    iconBgClass: 'bg-amber-100 dark:bg-amber-900/30',
    label: t('home.overview.workingHours'),
    hours: workingHoursParts.value.hours,
    minutes: workingHoursParts.value.minutes,
    skeletonClass: 'w-20',
    subtext: periodSubtext.value.hours,
  },
])

// Nuxt UI overrides
const hostUI = {
  root: 'rounded-lg shadow-panel ring-0 divide-y-0 md:rounded-xl',
  header: 'p-3 pb-0 sm:p-3 sm:pb-0 md:px-6 md:pt-4 md:pb-0',
  body: 'p-2.5 sm:p-2.5 md:p-6',
}
const cardUI = {
  root: 'h-full min-w-0 rounded-md shadow-none md:rounded-xl',
  body: 'p-2 sm:p-2 md:p-6',
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
      <div class="flex items-center justify-between gap-3">
        <Typography variant="h5" class="min-w-0 text-highlighted font-bold">{{
          t('home.overview.title')
        }}</Typography>
        <USelect
          v-model="activeTab"
          :items="periods"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('home.overview.periodLabel')"
          class="w-auto shrink-0 md:hidden"
          :content="{ align: 'end' }"
          :ui="{ base: 'rounded-full font-medium' }"
        />
        <UTabs
          v-model="activeTab"
          variant="pill"
          color="neutral"
          size="sm"
          :content="false"
          :items="periods"
          :ui="tabsUI"
          class="hidden md:block"
        />
      </div>
    </template>

    <div class="grid grid-cols-3 gap-1.5 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
      <UCard v-for="card in overviewCards" :key="card.key" :ui="cardUI">
        <div
          class="grid min-w-0 grid-cols-1 items-start gap-x-1.5 gap-y-0.5 md:grid-cols-[4rem_minmax(0,1fr)] md:items-center md:gap-x-4 md:gap-y-0"
        >
          <div
            class="col-start-1 row-start-1 flex size-6 shrink-0 items-center justify-center mb-1 mb:mb-0 rounded-sm md:row-span-3 md:size-16 md:rounded-lg"
            :class="card.iconBgClass"
          >
            <UIcon :name="card.icon" class="size-3.5 md:size-6" :class="card.iconClass" />
          </div>

          <Typography
            variant="footnote"
            class="col-start-1 row-start-2 line-clamp-2 text-xs font-semibold leading-tight text-muted md:col-start-2 md:row-start-1 md:uppercase md:tracking-wider"
          >
            {{ card.label }}
          </Typography>

          <div class="col-start-1 row-start-3 min-w-0 md:col-start-2 md:row-start-2">
            <USkeleton v-if="isPending" class="h-7 max-w-full" :class="card.skeletonClass" />
            <Typography
              v-else
              variant="h6"
              class="truncate text-highlighted font-bold tabular-nums md:text-lg"
            >
              <AnimatedNumber
                v-if="card.kind === 'money'"
                :value="card.numberValue"
                :format="card.numberFormat"
                :prefix="card.prefix"
                :suffix="card.suffix"
              />
              <AnimatedNumber v-else-if="card.kind === 'count'" :value="card.numberValue" />
              <template v-else>
                <AnimatedNumber :value="card.hours" :suffix="t('analytics.hoursUnit')" />
                <AnimatedNumber
                  v-if="card.minutes > 0"
                  :value="card.minutes"
                  :suffix="t('analytics.minutesUnit')"
                  class="ml-1"
                />
              </template>
            </Typography>
          </div>

          <Typography variant="footnote" class="col-start-2 row-start-3 hidden text-muted md:block">
            {{ card.subtext }}
          </Typography>
        </div>
      </UCard>
    </div>
  </UCard>
</template>
