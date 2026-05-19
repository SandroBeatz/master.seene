<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AnalyticsPeriod } from '@entities/analytics'
import { useAnalyticsQuery } from '@entities/analytics'
import { ActionAppointmentsWidget } from '@widgets/action-appointments'
import { UpcomingAppointmentsWidget } from '@widgets/upcoming-appointments'
import HomeEarnedTodayCard from './HomeEarnedTodayCard.vue'
import HomeCompletedCountCard from './HomeCompletedCountCard.vue'
import HomeWorkingHoursCard from './HomeWorkingHoursCard.vue'

const { t } = useI18n()

const period = ref<AnalyticsPeriod>('today')
const { data, isLoading } = useAnalyticsQuery(period)
</script>

<template>
  <UTheme
    :ui="{
      page: { root: 'px-12 py-3 w-full max-w-7xl mx-auto' },
      pageHeader: { root: 'border-none pb-2' },
    }"
  >
    <UPage as="main">
      <UPageHeader
        :title="t('home.title')"
        :description="t('home.description')"
        :ui="{ root: 'border-none' }"
      />
      <UPageBody>
        <div class="grid grid-cols-3 gap-10">
          <HomeEarnedTodayCard :earned="data?.earned" :loading="isLoading" />
          <HomeCompletedCountCard :count="data?.completed_count" :loading="isLoading" />
          <HomeWorkingHoursCard :minutes="data?.working_minutes" :loading="isLoading" />
        </div>
        <div class="grid grid-cols-3 gap-10">
          <div class="col-span-2">
            <ActionAppointmentsWidget />
          </div>

          <UpcomingAppointmentsWidget />
        </div>
      </UPageBody>
    </UPage>
  </UTheme>
</template>
