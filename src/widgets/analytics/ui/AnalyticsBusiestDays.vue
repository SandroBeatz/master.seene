<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChartData, ChartOptions } from 'chart.js'
import { BaseBarChart, useChartTheme } from '@shared/ui/chart'
import { useFormats } from '@shared/lib/formats'

const props = defineProps<{
  days: number[]
  peakFrom: number | null
  peakTo: number | null
  loading: boolean
}>()

const { t } = useI18n()
const formats = useFormats()
const theme = useChartTheme()

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

const weekdayLabels = computed(() =>
  WEEKDAY_KEYS.map((key) => t(`analytics.weekdaysShort.${key}`)),
)

const chartData = computed<ChartData<'bar'>>(() => {
  const max = Math.max(...props.days, 0)
  const colors = props.days.map((value) =>
    max > 0 && value === max ? theme.value.highlight : theme.value.muted,
  )
  return {
    labels: weekdayLabels.value,
    datasets: [
      {
        data: props.days,
        backgroundColor: colors,
        categoryPercentage: 0.7,
        barPercentage: 0.9,
      },
    ],
  }
})

const options = computed<ChartOptions<'bar'>>(() => ({
  plugins: { tooltip: { enabled: Math.max(...props.days, 0) > 0 } },
}))

/** "HH:MM – HH:MM" in the master's 12/24h format, or an em dash when unknown. */
const peakRange = computed(() => {
  if (props.peakFrom == null || props.peakTo == null) return '—'
  const fmt = (hour: number) => formats.time(`${String(hour).padStart(2, '0')}:00`)
  return `${fmt(props.peakFrom)} – ${fmt(props.peakTo)}`
})
</script>

<template>
  <UPageCard variant="subtle" :ui="{ root: 'shadow-none' }">
    <div class="space-y-4">
      <div>
        <p class="text-sm font-semibold">{{ t('analytics.busiest.title') }}</p>
        <p class="text-xs text-muted">{{ t('analytics.busiest.peakHours') }} {{ peakRange }}</p>
      </div>

      <div v-if="loading" class="h-44 w-full animate-pulse rounded-lg bg-elevated" />
      <div v-else class="h-44">
        <BaseBarChart :data="chartData" :options="options" />
      </div>
    </div>
  </UPageCard>
</template>
