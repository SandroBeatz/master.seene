<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChartData, ChartOptions } from 'chart.js'
import type { RevenuePoint } from '@entities/analytics'
import { BaseBarChart, useChartTheme } from '@shared/ui/chart'
import { useFormats } from '@shared/lib/formats'

const props = defineProps<{
  series: RevenuePoint[]
  earned: number
  periodLabel: string
  compare: boolean
  loading: boolean
}>()

const { t } = useI18n()
const formats = useFormats()
const theme = useChartTheme()

const chartData = computed<ChartData<'bar'>>(() => {
  const datasets: ChartData<'bar'>['datasets'] = [
    {
      label: t('analytics.revenue.thisPeriod'),
      data: props.series.map((p) => p.current),
      backgroundColor: theme.value.primary,
      categoryPercentage: 0.6,
      barPercentage: 0.85,
    },
  ]
  if (props.compare) {
    datasets.push({
      label: t('analytics.revenue.previous'),
      data: props.series.map((p) => p.previous),
      backgroundColor: theme.value.neutralSoft,
      categoryPercentage: 0.6,
      barPercentage: 0.85,
    })
  }
  return { labels: props.series.map((p) => p.label), datasets }
})

const options = computed<ChartOptions<'bar'>>(() => ({
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
  <UPageCard variant="subtle" :ui="{ root: 'shadow-none' }">
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-sm font-semibold">{{ t('analytics.revenue.title') }}</p>
          <div v-if="loading" class="mt-1 h-7 w-28 animate-pulse rounded bg-elevated" />
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

      <div v-if="loading" class="h-56 w-full animate-pulse rounded-lg bg-elevated" />
      <div v-else class="h-56">
        <BaseBarChart :data="chartData" :options="options" />
      </div>
    </div>
  </UPageCard>
</template>
