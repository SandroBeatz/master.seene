<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import type { TabsItem } from '@nuxt/ui'
import type { AnalyticsPeriod } from '@entities/analytics'
import { useAnalyticsQuery } from '@entities/analytics'
import { useFormats } from '@shared/lib/formats'

const { t } = useI18n()
const formats = useFormats()

type PeriodKey = 'day' | 'week' | 'month'

const activeTab = ref<PeriodKey>('day')

const periodToAnalytics: Record<PeriodKey, AnalyticsPeriod> = {
  day: 'today',
  week: 'week',
  month: 'month',
}

const analyticsPeriod = computed(() => periodToAnalytics[activeTab.value])
const { data, isPending } = useAnalyticsQuery(analyticsPeriod)

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
  const minutes = data.value?.working_minutes
  if (minutes === undefined) return '—'
  if (minutes === 0) return `0${t('analytics.hoursUnit')}`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h}${t('analytics.hoursUnit')}`
  return `${h}${t('analytics.hoursUnit')} ${m}${t('analytics.minutesUnit')}`
})
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold">{{ t('home.overview.title') }}</h2>
        <UTabs
          v-model="activeTab"
          variant="pill"
          color="neutral"
          size="sm"
          :content="false"
          :items="periods"
        />
      </div>
    </template>

    <div class="grid grid-cols-3 gap-4">
      <RouterLink to="/analytics" class="block">
        <UCard variant="subtle" :ui="{ root: 'shadow-none h-full' }">
          <div class="flex items-center gap-4">
            <div
              class="size-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0"
            >
              <UIcon name="i-lucide-banknote" class="size-6 text-green-600 dark:text-green-400" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-medium uppercase tracking-wide text-muted">
                {{ t('home.overview.earnedToday') }}
              </p>
              <div v-if="isPending" class="h-7 w-24 animate-pulse rounded bg-elevated mt-1" />
              <p v-else class="text-2xl font-semibold leading-tight mt-0.5">
                {{ formats.price(data?.earned ?? 0) }}
              </p>
              <p class="text-sm text-muted">{{ periodSubtext.earned }}</p>
            </div>
          </div>
        </UCard>
      </RouterLink>

      <UCard variant="subtle" :ui="{ root: 'shadow-none' }">
        <div class="flex items-center gap-4">
          <div
            class="size-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0"
          >
            <UIcon
              name="i-lucide-calendar-check"
              class="size-6 text-violet-600 dark:text-violet-400"
            />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium uppercase tracking-wide text-muted">
              {{ t('home.overview.appointments') }}
            </p>
            <div v-if="isPending" class="h-7 w-16 animate-pulse rounded bg-elevated mt-1" />
            <p v-else class="text-2xl font-semibold leading-tight mt-0.5">
              {{ data?.completed_count ?? 0 }}
            </p>
            <p class="text-sm text-muted">{{ periodSubtext.appointments }}</p>
          </div>
        </div>
      </UCard>

      <UCard variant="subtle" :ui="{ root: 'shadow-none' }">
        <div class="flex items-center gap-4">
          <div
            class="size-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0"
          >
            <UIcon name="i-lucide-clock" class="size-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div class="min-w-0">
            <p class="text-xs font-medium uppercase tracking-wide text-muted">
              {{ t('home.overview.workingHours') }}
            </p>
            <div v-if="isPending" class="h-7 w-20 animate-pulse rounded bg-elevated mt-1" />
            <p v-else class="text-2xl font-semibold leading-tight mt-0.5">{{ hoursLabel }}</p>
            <p class="text-sm text-muted">{{ periodSubtext.hours }}</p>
          </div>
        </div>
      </UCard>
    </div>
  </UCard>
</template>
