<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import './register'
import { baseChartOptions, mergeDeep, useChartTheme } from './theme'

const props = defineProps<{
  data: ChartData<'doughnut'>
  options?: ChartOptions<'doughnut'>
}>()

const theme = useChartTheme()
const options = computed<ChartOptions<'doughnut'>>(() =>
  mergeDeep<ChartOptions<'doughnut'>>(
    {
      ...baseChartOptions<'doughnut'>(theme.value),
      cutout: '72%',
    },
    props.options,
  ),
)
</script>

<template>
  <Doughnut :data="data" :options="options" />
</template>
