<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import './register'
import { baseChartOptions, cartesianScales, mergeDeep, useChartTheme } from './theme'

const props = defineProps<{
  data: ChartData<'line'>
  options?: ChartOptions<'line'>
}>()

const theme = useChartTheme()
const options = computed<ChartOptions<'line'>>(() =>
  mergeDeep<ChartOptions<'line'>>(
    {
      ...baseChartOptions<'line'>(theme.value),
      scales: cartesianScales(theme.value),
      elements: { line: { tension: 0.35 }, point: { radius: 0, hitRadius: 12 } },
    },
    props.options,
  ),
)
</script>

<template>
  <Line :data="data" :options="options" />
</template>
