<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChartData, ChartOptions } from 'chart.js'
import { IonCard, IonSkeletonText } from '@ionic/vue'
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
const weekdayLabels = computed(() => WEEKDAY_KEYS.map((key) => t(`analytics.weekdaysShort.${key}`)))

const chartData = computed<ChartData<'bar'>>(() => {
  const max = Math.max(...props.days, 0)
  const colors = props.days.map((value) =>
    max > 0 && value === max ? theme.value.highlight : theme.value.muted,
  )
  return {
    labels: weekdayLabels.value,
    datasets: [{ data: props.days, backgroundColor: colors, categoryPercentage: 0.7, barPercentage: 0.9 }],
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
  <ion-card class="card">
    <div>
      <p class="title">{{ t('analytics.busiest.title') }}</p>
      <p class="muted text-xs">
        {{ t('analytics.busiest.peakHours') }} {{ peakRange }} ·
        {{ t('analytics.windows.last8Weeks') }}
      </p>
    </div>

    <div v-if="loading" class="chart-box mt-4">
      <ion-skeleton-text :animated="true" style="width: 100%; height: 100%" />
    </div>
    <div v-else class="chart-box mt-4">
      <base-bar-chart :data="chartData" :options="options" />
    </div>
  </ion-card>
</template>

<style scoped>
.card {
  --background: var(--se-surface-card);
  margin: 0;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.title {
  font-size: 0.85rem;
  font-weight: 600;
}

.muted {
  color: var(--ion-color-medium);
}

.chart-box {
  height: 170px;
}
</style>
