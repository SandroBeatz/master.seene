<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { DateFormatter } from '@internationalized/date'
import type { ChartData, ChartOptions } from 'chart.js'
import { IonCard, IonSkeletonText } from '@ionic/vue'
import { trendingUpOutline, barChartOutline } from 'ionicons/icons'
import type { AnalyticsPeriodKind, RevenuePoint } from '@entities/analytics'
// Same chart wrappers the desktop analytics uses (chart.js / vue-chartjs, no
// Nuxt UI) — the mobile card swaps the shell for Ionic and feeds the chart its
// colors from the Ionic theme (see `colors` below).
import { BaseBarChart, BaseLineChart } from '@shared/ui/chart'
import { useFormats } from '@shared/lib/formats'
import { useAppearanceStore } from '@shared/lib/appearance'
import { SegmentedControl } from '@shared/ui/segmented-control/index.mobile'

const props = defineProps<{
  series: RevenuePoint[]
  earned: number
  periodLabel: string
  periodKind?: AnalyticsPeriodKind
  compare: boolean
  loading: boolean
}>()

const { t, locale } = useI18n()
const formats = useFormats()
const appearance = useAppearanceStore()

// The shared chart theme reads Nuxt UI's `--ui-*` variables and the desktop
// `dark` class, neither of which exists in this bundle — so it fell back to
// fixed amber/light-mode colors. Resolve the series + chrome colors from the
// Ionic theme instead; canvas needs concrete values, so re-read them whenever
// the accent color or light/dark changes.
function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

const colors = computed(() => {
  void appearance.primary
  void appearance.theme
  const primaryRgb = cssVar('--ion-color-primary-rgb')
  const isDark = document.documentElement.classList.contains('ion-palette-dark')
  return {
    primary: cssVar('--ion-color-primary'),
    primaryFill: `rgba(${primaryRgb}, 0.12)`,
    previous: isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.18)',
    text: cssVar('--ion-color-medium'),
    grid: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
    tooltipBg: isDark ? cssVar('--ion-background-color-step-200') : cssVar('--ion-text-color'),
    tooltipText: isDark ? cssVar('--ion-text-color') : cssVar('--ion-background-color'),
  }
})

// --- Chart type toggle (line / bar), persisted like the desktop version ------
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
const chartTypeItems = computed(() => [
  {
    value: 'line' as const,
    icon: trendingUpOutline,
    ariaLabel: t('analytics.revenue.chartTypeLine'),
  },
  { value: 'bar' as const, icon: barChartOutline, ariaLabel: t('analytics.revenue.chartTypeBar') },
])
watch(chartType, (value) => {
  try {
    localStorage.setItem(CHART_TYPE_KEY, value)
  } catch {
    // storage unavailable (private mode) — selection just won't persist
  }
})

const hasData = computed(() => props.series.length > 0)

/** X-axis label: week → weekday + day, month → day-of-month, else server label. */
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

const lineChartData = computed<ChartData<'line'>>(() => {
  const datasets: ChartData<'line'>['datasets'] = [
    {
      label: t('analytics.revenue.thisPeriod'),
      data: currentData.value,
      borderColor: colors.value.primary,
      backgroundColor: colors.value.primaryFill,
      borderWidth: 2.5,
      tension: 0.35,
      fill: 'origin',
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: colors.value.primary,
      pointHoverBorderWidth: 0,
    },
  ]
  if (props.compare) {
    datasets.push({
      label: t('analytics.revenue.previous'),
      data: previousData.value,
      borderColor: colors.value.previous,
      backgroundColor: colors.value.previous,
      borderWidth: 2,
      borderDash: [4, 4],
      tension: 0.35,
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 4,
    })
  }
  return { labels: labels.value, datasets }
})

const barChartData = computed<ChartData<'bar'>>(() => {
  const datasets: ChartData<'bar'>['datasets'] = [
    {
      label: t('analytics.revenue.thisPeriod'),
      data: currentData.value,
      backgroundColor: colors.value.primary,
      categoryPercentage: 0.6,
      barPercentage: 0.85,
    },
  ]
  if (props.compare) {
    datasets.push({
      label: t('analytics.revenue.previous'),
      data: previousData.value,
      backgroundColor: colors.value.previous,
      categoryPercentage: 0.6,
      barPercentage: 0.85,
    })
  }
  return { labels: labels.value, datasets }
})

// Chrome (ticks, gridlines, tooltip) in the Ionic theme colors. Faint
// horizontal gridlines give the values a scale without y-axis labels.
const chromeOptions = computed(() => ({
  interaction: { mode: 'index' as const, intersect: false },
  scales: {
    x: {
      ticks: { color: colors.value.text, maxRotation: 0, autoSkipPadding: 12 },
    },
    y: {
      display: true,
      border: { display: false },
      grid: { display: true, color: colors.value.grid, drawTicks: false },
      ticks: { display: false, maxTicksLimit: 4 },
    },
  },
  plugins: {
    tooltip: {
      backgroundColor: colors.value.tooltipBg,
      titleColor: colors.value.tooltipText,
      bodyColor: colors.value.tooltipText,
      borderWidth: 0,
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
          `${ctx.dataset.label}: ${formats.price(ctx.parsed.y ?? 0)}`,
      },
    },
  },
}))

const lineOptions = computed(() => chromeOptions.value as ChartOptions<'line'>)
const barOptions = computed(() => chromeOptions.value as ChartOptions<'bar'>)
</script>

<template>
  <ion-card class="card">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="title">{{ t('analytics.revenue.title') }}</p>
        <div v-if="loading" class="mt-1 space-y-1.5">
          <ion-skeleton-text :animated="true" style="width: 120px; height: 26px" />
          <ion-skeleton-text :animated="true" style="width: 64px; height: 12px" />
        </div>
        <template v-else>
          <p class="total truncate">{{ formats.price(earned) }}</p>
          <p class="muted text-xs">{{ periodLabel }}</p>
        </template>
      </div>

      <!-- Chart type switch (line / bar) -->
      <segmented-control
        v-if="!loading"
        v-model="chartType"
        class="type-toggle"
        :items="chartTypeItems"
      />
    </div>

    <div v-if="loading" class="chart-box mt-4 flex items-center justify-center">
      <ion-skeleton-text :animated="true" style="width: 100%; height: 100%" />
    </div>
    <p v-else-if="!hasData" class="muted chart-box mt-4 flex items-center justify-center text-sm">
      {{ t('analytics.noData') }}
    </p>
    <div v-else class="chart-box mt-4">
      <base-line-chart v-if="chartType === 'line'" :data="lineChartData" :options="lineOptions" />
      <base-bar-chart v-else :data="barChartData" :options="barOptions" />
    </div>

    <div v-if="!loading && hasData" class="legend muted mt-3">
      <span class="legend-item">
        <span class="dot" :style="{ backgroundColor: colors.primary }" />
        {{ t('analytics.revenue.thisPeriod') }}
      </span>
      <span v-if="compare" class="legend-item">
        <span class="dot" :style="{ backgroundColor: colors.previous }" />
        {{ t('analytics.revenue.previous') }}
      </span>
    </div>
  </ion-card>
</template>

<style scoped>
.card {
  --background: var(--se-surface-card);
  /* MD tints ion-card text gray by default; keep the iOS/regular text color. */
  --color: var(--ion-text-color);
  margin: 0;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.title {
  font-size: 0.85rem;
  font-weight: 600;
}

.total {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.2;
}

.muted {
  color: var(--ion-color-medium);
}

/* Fixed height keeps the responsive canvas inside the card on every width. */
.chart-box {
  height: 220px;
}

.type-toggle {
  flex-shrink: 0;
}

.legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  font-size: 0.75rem;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
}
</style>
