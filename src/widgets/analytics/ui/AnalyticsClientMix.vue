<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChartData, ChartOptions } from 'chart.js'
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
    return { labels: [], datasets: [{ data: [1], backgroundColor: [theme.value.muted], borderWidth: 0 }] }
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
  plugins: {
    tooltip: { enabled: hasData.value },
  },
}))

const legend = computed(() => [
  { key: 'returning', label: t('analytics.clientMix.returning'), value: props.mix.returning, color: theme.value.primary },
  { key: 'new', label: t('analytics.clientMix.new'), value: props.mix.new, color: theme.value.neutral },
])
</script>

<template>
  <UCard :ui="{ root: 'shadow-panel ring-0' }">
    <div class="space-y-4">
      <div>
        <p class="text-sm font-semibold">{{ t('analytics.clientMix.title') }}</p>
        <p class="text-xs text-muted">
          {{ t('analytics.clientMix.uniqueClients', { count: mix.total }) }}
        </p>
      </div>

      <div v-if="loading" class="flex items-center gap-6">
        <div class="size-32 shrink-0 animate-pulse rounded-full bg-elevated" />
        <div class="flex-1 space-y-3">
          <div class="h-5 w-24 animate-pulse rounded bg-elevated" />
          <div class="h-5 w-20 animate-pulse rounded bg-elevated" />
        </div>
      </div>

      <div v-else class="flex items-center gap-6">
        <div class="relative size-32 shrink-0">
          <BaseDoughnutChart :data="chartData" :options="options" />
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-xl font-semibold">{{ returningPct }}%</span>
            <span class="text-[10px] uppercase text-muted">{{ t('analytics.clientMix.returning') }}</span>
          </div>
        </div>

        <ul class="flex-1 space-y-3">
          <li
            v-for="item in legend"
            :key="item.key"
            class="flex items-center justify-between gap-3 text-sm"
          >
            <span class="flex items-center gap-2 text-muted">
              <span class="size-2.5 rounded-full" :style="{ backgroundColor: item.color }" />
              {{ item.label }}
            </span>
            <span class="font-semibold">{{ item.value }}</span>
          </li>
        </ul>
      </div>
    </div>
  </UCard>
</template>
