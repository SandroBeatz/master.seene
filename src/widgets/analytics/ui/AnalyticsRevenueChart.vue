<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { DateFormatter } from '@internationalized/date'
import type { ChartData, ChartOptions } from 'chart.js'
import type { AnalyticsPeriodKind, RevenuePoint } from '@entities/analytics'
import { BaseLineChart, useChartTheme } from '@shared/ui/chart'
import { useFormats } from '@shared/lib/formats'

const props = defineProps<{
  series: RevenuePoint[]
  earned: number
  periodLabel: string
  /** Drives the x-axis label format; omitted → the server-formatted label is used. */
  periodKind?: AnalyticsPeriodKind
  compare: boolean
  loading: boolean
}>()

const { t, locale } = useI18n()
const formats = useFormats()
const theme = useChartTheme()

/**
 * X-axis label for a bucket. Week → localized weekday + day ("Mon 7"),
 * month → day-of-month ("7"). Other granularities keep the server label.
 */
function labelFor(p: RevenuePoint): string {
  const d = new Date(p.bucket)
  if (props.periodKind === 'week') {
    return new DateFormatter(locale.value, { weekday: 'short', day: 'numeric' }).format(d)
  }
  if (props.periodKind === 'month') {
    return new DateFormatter(locale.value, { day: 'numeric' }).format(d)
  }
  return p.label
}

function lineDataset(
  label: string,
  data: number[],
  color: string,
): ChartData<'line'>['datasets'][number] {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    tension: 0.3,
    fill: false,
    pointRadius: 2,
    pointHoverRadius: 4,
  }
}

const chartData = computed<ChartData<'line'>>(() => {
  const datasets: ChartData<'line'>['datasets'] = [
    lineDataset(
      t('analytics.revenue.thisPeriod'),
      props.series.map((p) => p.current),
      theme.value.primary,
    ),
  ]
  if (props.compare) {
    datasets.push(
      lineDataset(
        t('analytics.revenue.previous'),
        props.series.map((p) => p.previous),
        theme.value.neutralSoft,
      ),
    )
  }
  return { labels: props.series.map(labelFor), datasets }
})

const options = computed<ChartOptions<'line'>>(() => ({
  plugins: {
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${formats.price(ctx.parsed.y)}`,
      },
    },
  },
}))
</script>

<template>
  <UCard :ui="{ root: 'shadow-panel ring-0' }">
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold">{{ t('analytics.revenue.title') }}</p>
          <div v-if="loading" class="mt-1 space-y-1.5">
            <USkeleton class="h-7 w-28" />
            <USkeleton class="h-3 w-16" />
          </div>
          <template v-else>
            <p class="text-2xl font-semibold">{{ formats.price(earned) }}</p>
            <p class="text-xs text-muted">{{ periodLabel }}</p>
          </template>
        </div>

        <div class="flex shrink-0 items-center gap-3 text-xs text-muted">
          <span class="flex items-center gap-1.5">
            <span class="size-2.5 rounded-full bg-primary" />
            {{ t('analytics.revenue.thisPeriod') }}
          </span>
          <span v-if="compare" class="flex items-center gap-1.5">
            <span class="size-2.5 rounded-full bg-muted" />
            {{ t('analytics.revenue.previous') }}
          </span>
        </div>
      </div>

      <!-- Placeholder mirroring the chart height -->
      <div v-if="loading" class="flex h-56 items-end gap-4 px-2">
        <USkeleton
          v-for="(h, i) in [45, 70, 55, 85, 40, 65, 50]"
          :key="i"
          class="flex-1 rounded-t-md rounded-b-none"
          :style="{ height: `${h}%` }"
        />
      </div>
      <div v-else class="h-56">
        <BaseLineChart :data="chartData" :options="options" />
      </div>
    </div>
  </UCard>
</template>
