<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChartData, ChartOptions } from 'chart.js'
import { IonCard, IonSkeletonText } from '@ionic/vue'
import type { ClientMix } from '@entities/analytics'
import { BaseDoughnutChart, useChartTheme } from '@shared/ui/chart'

const props = defineProps<{
  mix: ClientMix
  loading: boolean
}>()

const { t } = useI18n()
const theme = useChartTheme()

const hasData = computed(() => props.mix.total > 0)
const returningPct = computed(() =>
  hasData.value ? Math.round((props.mix.returning / props.mix.total) * 100) : 0,
)

const chartData = computed<ChartData<'doughnut'>>(() => {
  if (!hasData.value) {
    return {
      labels: [],
      datasets: [{ data: [1], backgroundColor: [theme.value.muted], borderWidth: 0 }],
    }
  }
  return {
    labels: [t('analytics.clientMix.returning'), t('analytics.clientMix.new')],
    datasets: [
      {
        data: [props.mix.returning, props.mix.new],
        backgroundColor: [theme.value.primary, theme.value.neutral],
        borderWidth: 0,
      },
    ],
  }
})

const options = computed<ChartOptions<'doughnut'>>(() => ({
  plugins: { tooltip: { enabled: hasData.value } },
}))

const legend = computed(() => [
  {
    key: 'returning',
    label: t('analytics.clientMix.returning'),
    value: props.mix.returning,
    color: theme.value.primary,
  },
  {
    key: 'new',
    label: t('analytics.clientMix.new'),
    value: props.mix.new,
    color: theme.value.neutral,
  },
])
</script>

<template>
  <ion-card class="card">
    <div>
      <p class="title">{{ t('analytics.clientMix.title') }}</p>
      <p class="muted text-xs">
        {{ t('analytics.clientMix.uniqueClients', { count: mix.total }) }} ·
        {{ t('analytics.windows.last90Days') }}
      </p>
    </div>

    <div v-if="loading" class="mt-4 flex items-center gap-5">
      <ion-skeleton-text :animated="true" class="donut-skeleton" />
      <div class="flex-1 space-y-3">
        <ion-skeleton-text :animated="true" style="width: 80%; height: 16px" />
        <ion-skeleton-text :animated="true" style="width: 60%; height: 16px" />
      </div>
    </div>

    <div v-else class="mt-4 flex items-center gap-5">
      <div class="donut">
        <base-doughnut-chart :data="chartData" :options="options" />
        <div class="donut-center">
          <span class="pct">{{ returningPct }}%</span>
          <span class="muted pct-label">{{ t('analytics.clientMix.returning') }}</span>
        </div>
      </div>

      <ul class="flex-1 space-y-3">
        <li v-for="item in legend" :key="item.key" class="flex items-center justify-between gap-3">
          <span class="muted flex items-center gap-2 text-sm">
            <span class="dot" :style="{ backgroundColor: item.color }" />
            {{ item.label }}
          </span>
          <span class="font-semibold">{{ item.value }}</span>
        </li>
      </ul>
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

.donut {
  position: relative;
  width: 116px;
  height: 116px;
  flex-shrink: 0;
}

.donut-skeleton {
  width: 116px;
  height: 116px;
  border-radius: 9999px;
  flex-shrink: 0;
}

.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.pct {
  font-size: 1.25rem;
  font-weight: 600;
}

.pct-label {
  font-size: 10px;
  text-transform: uppercase;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
}
</style>
