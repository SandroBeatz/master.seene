<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { DateFormatter } from '@internationalized/date'
import type { ChartData, ChartOptions } from 'chart.js'
import { IonCard, IonSegment, IonSegmentButton, IonIcon, IonSkeletonText } from '@ionic/vue'
import { trendingUpOutline, barChartOutline } from 'ionicons/icons'
import type { AnalyticsPeriodKind, RevenuePoint } from '@entities/analytics'
// Same chart wrappers + theme the desktop analytics uses (chart.js / vue-chartjs,
// no Nuxt UI) — the mobile card only swaps the surrounding shell for Ionic.
import { BaseBarChart, BaseLineChart, useChartTheme } from '@shared/ui/chart'
import { useFormats } from '@shared/lib/formats'

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
const theme = useChartTheme()

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
      borderColor: theme.value.primary,
      backgroundColor: theme.value.primary,
      tension: 0.3,
      fill: false,
      pointRadius: 2,
      pointHoverRadius: 4,
    },
  ]
  if (props.compare) {
    datasets.push({
      label: t('analytics.revenue.previous'),
      data: previousData.value,
      borderColor: theme.value.neutralSoft,
      backgroundColor: theme.value.neutralSoft,
      tension: 0.3,
      fill: false,
      pointRadius: 2,
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
      backgroundColor: theme.value.primary,
      categoryPercentage: 0.6,
      barPercentage: 0.85,
    },
  ]
  if (props.compare) {
    datasets.push({
      label: t('analytics.revenue.previous'),
      data: previousData.value,
      backgroundColor: theme.value.neutralSoft,
      categoryPercentage: 0.6,
      barPercentage: 0.85,
    })
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
      <ion-segment v-if="!loading" v-model="chartType" class="type-toggle">
        <ion-segment-button value="line" :aria-label="t('analytics.revenue.chartTypeLine')">
          <ion-icon :icon="trendingUpOutline" />
        </ion-segment-button>
        <ion-segment-button value="bar" :aria-label="t('analytics.revenue.chartTypeBar')">
          <ion-icon :icon="barChartOutline" />
        </ion-segment-button>
      </ion-segment>
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
        <span class="dot" :style="{ backgroundColor: theme.primary }" />
        {{ t('analytics.revenue.thisPeriod') }}
      </span>
      <span v-if="compare" class="legend-item">
        <span class="dot" :style="{ backgroundColor: theme.neutralSoft }" />
        {{ t('analytics.revenue.previous') }}
      </span>
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
  width: auto;
  flex-shrink: 0;
}

.type-toggle ion-segment-button {
  min-width: 44px;
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
