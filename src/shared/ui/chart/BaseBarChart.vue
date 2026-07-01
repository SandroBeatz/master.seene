<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import './register'
import { baseChartOptions, cartesianScales, mergeDeep, useChartTheme } from './theme'

const props = defineProps<{
  data: ChartData<'bar'>
  options?: ChartOptions<'bar'>
}>()

const theme = useChartTheme()
const options = computed<ChartOptions<'bar'>>(() =>
  mergeDeep<ChartOptions<'bar'>>(
    { ...baseChartOptions<'bar'>(theme.value), scales: cartesianScales(theme.value) },
    props.options,
  ),
)
</script>

<template>
  <Bar :data="data" :options="options" />
</template>
