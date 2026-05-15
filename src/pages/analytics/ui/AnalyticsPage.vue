<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AnalyticsPeriod } from '@entities/analytics'
import { useAnalyticsQuery } from '@entities/analytics'
import AnalyticsPeriodTabs from './AnalyticsPeriodTabs.vue'
import AnalyticsStatCards from './AnalyticsStatCards.vue'
import AnalyticsTopServices from './AnalyticsTopServices.vue'

const { t } = useI18n()
const period = ref<AnalyticsPeriod>('today')
const { data, isLoading } = useAnalyticsQuery(period)
</script>

<template>
  <UPage :ui="{ root: 'px-12 max-w-7xl mx-auto' }" as="main">
    <UPageHeader
      :title="t('analytics.title')"
      :description="t('analytics.description')"
      :ui="{ root: 'border-none' }"
    >
      <template #links>
        <AnalyticsPeriodTabs v-model="period" />
      </template>
    </UPageHeader>
    <UPageBody>
      <div class="space-y-6">
        <AnalyticsStatCards :data="data" :loading="isLoading" />
        <AnalyticsTopServices :services="data?.top_services ?? []" :loading="isLoading" />
      </div>
    </UPageBody>
  </UPage>
</template>
