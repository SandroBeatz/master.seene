<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { DateFormatter } from '@internationalized/date'
import type { ChartData, ChartOptions } from 'chart.js'
import type { AnalyticsPeriodKind, RevenuePoint } from '@entities/analytics'
import { BaseBarChart, BaseLineChart, useChartTheme } from '@shared/ui/chart'
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

// --- Chart type toggle (line / bar), persisted across reloads ---------------

type ChartType = 'line' | 'bar'
const CHART_TYPE_KEY = 'analytics:chartType'

function loadChartType(): ChartType {
  try {
    return localStorage.getItem(CHART_TYPE_KEY) === 'bar' ? 'bar' : 'line'
  } catch {
    return 'line'
  }
}

const chartType = ref<ChartType>(loadChartType())
watch(chartType, (value) => {
  try {
    localStorage.setItem(CHART_TYPE_KEY, value)
  } catch {
    // storage unavailable (private mode) — selection just won't persist
  }
})

const chartTypeItems = computed<{ value: ChartType; icon: string; label: string }[]>(() => [
  { value: 'line', icon: 'i-lucide-chart-line', label: t('analytics.revenue.chartTypeLine') },
  { value: 'bar', icon: 'i-lucide-chart-column', label: t('analytics.revenue.chartTypeBar') },
])

// --- Data mapping -----------------------------------------------------------

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

const labels = computed(() => props.series.map(labelFor))
const currentData = computed(() => props.series.map((p) => p.current))
const previousData = computed(() => props.series.map((p) => p.previous))

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

function barDataset(
  label: string,
  data: number[],
  color: string,
): ChartData<'bar'>['datasets'][number] {
  return { label, data, backgroundColor: color, categoryPercentage: 0.6, barPercentage: 0.85 }
}

const lineChartData = computed<ChartData<'line'>>(() => {
  const datasets: ChartData<'line'>['datasets'] = [
    lineDataset(t('analytics.revenue.thisPeriod'), currentData.value, theme.value.primary),
  ]
  if (props.compare) {
    datasets.push(
      lineDataset(t('analytics.revenue.previous'), previousData.value, theme.value.neutralSoft),
    )
  }
  return { labels: labels.value, datasets }
})

const barChartData = computed<ChartData<'bar'>>(() => {
  const datasets: ChartData<'bar'>['datasets'] = [
    barDataset(t('analytics.revenue.thisPeriod'), currentData.value, theme.value.primary),
  ]
  if (props.compare) {
    datasets.push(
      barDataset(t('analytics.revenue.previous'), previousData.value, theme.value.neutralSoft),
    )
  }
  return { labels: labels.value, datasets }
})

const lineOptions = computed<ChartOptions<'line'>>(() => ({
  plugins: {
    tooltip: {
      callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formats.price(ctx.parsed.y)}` },
    },
  },
}))

const barOptions = computed<ChartOptions<'bar'>>(() => ({
  plugins: {
    tooltip: {
      callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formats.price(ctx.parsed.y)}` },
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

        <!-- Chart type switch (line / bar) -->
        <UFieldGroup v-if="!loading" size="sm" class="shrink-0">
          <UButton
            v-for="item in chartTypeItems"
            :key="item.value"
            :variant="chartType === item.value ? 'solid' : 'outline'"
            :icon="item.icon"
            :aria-label="item.label"
            :title="item.label"
            color="neutral"
            @click="chartType = item.value"
          />
        </UFieldGroup>
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
        <BaseLineChart v-if="chartType === 'line'" :data="lineChartData" :options="lineOptions" />
        <BaseBarChart v-else :data="barChartData" :options="barOptions" />
      </div>

      <!-- Legend under the chart; dot colours match the line/dataset colours. -->
      <div v-if="!loading" class="flex items-center justify-center gap-4 text-xs text-muted">
        <span class="flex items-center gap-1.5">
          <span class="size-2.5 rounded-full" :style="{ backgroundColor: theme.primary }" />
          {{ t('analytics.revenue.thisPeriod') }}
        </span>
        <span v-if="compare" class="flex items-center gap-1.5">
          <span class="size-2.5 rounded-full" :style="{ backgroundColor: theme.neutralSoft }" />
          {{ t('analytics.revenue.previous') }}
        </span>
      </div>
    </div>
  </UCard>
</template>
