<script setup lang="ts">
import { ref } from 'vue'
import type { AnalyticsPeriod } from '@entities/analytics'
import { useAnalyticsQuery } from '@entities/analytics'
import HomeCompletedCountCard from './HomeCompletedCountCard.vue'
import HomeEarnedTodayCard from './HomeEarnedTodayCard.vue'
import HomeWorkingHoursCard from './HomeWorkingHoursCard.vue'

const period = ref<AnalyticsPeriod>('today')
const { data, isLoading } = useAnalyticsQuery(period)
</script>

<template>
  <div class="grid grid-cols-3 gap-10">
    <HomeEarnedTodayCard :earned="data?.earned" :loading="isLoading" />
    <HomeCompletedCountCard :count="data?.completed_count" :loading="isLoading" />
    <HomeWorkingHoursCard :minutes="data?.working_minutes" :loading="isLoading" />
  </div>
</template>
