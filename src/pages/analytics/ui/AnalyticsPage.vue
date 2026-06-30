<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AnalyticsPeriodV2 } from '@entities/analytics'
import { useAnalyticsQueryV2 } from '@entities/analytics'
import AnalyticsStatCards from './AnalyticsStatCards.vue'
import AnalyticsTopServices from './AnalyticsTopServices.vue'

const { t } = useI18n()
// Interim defaults — the date toolbar (T5) and full mockup layout (T11) replace this.
const period = ref<AnalyticsPeriodV2>('this_month')
const compare = ref(false)
const { data, isLoading } = useAnalyticsQueryV2(period)
</script>

<template>
  <UPage :ui="{ root: 'px-12 max-w-7xl mx-auto' }" as="main">
    <UPageHeader
      :title="t('analytics.title')"
      :description="t('analytics.description')"
      :ui="{ root: 'border-none' }"
    />
    <UPageBody>
      <div class="space-y-6">
        <AnalyticsStatCards :data="data" :loading="isLoading" :compare="compare" />
        <AnalyticsTopServices :services="data?.top_services ?? []" :loading="isLoading" />
      </div>
    </UPageBody>
  </UPage>
</template>
