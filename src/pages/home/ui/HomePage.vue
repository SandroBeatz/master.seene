<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnalyticsQuery } from '@entities/analytics'
import { ActionAppointmentsWidget } from '@widgets/action-appointments'
import { UpcomingAppointmentsWidget } from '@widgets/upcoming-appointments'
import HomeEarnedTodayCard from './HomeEarnedTodayCard.vue'
import HomeCompletedCountCard from './HomeCompletedCountCard.vue'
import HomeWorkingHoursCard from './HomeWorkingHoursCard.vue'

const { t } = useI18n()

const period = ref('today' as const)
const { data, isLoading } = useAnalyticsQuery(period)
</script>

<template>
  <UPage :ui="{ root: 'px-12 max-w-7xl mx-auto' }" as="main">
    <UPageHeader
      :title="t('home.title')"
      :description="t('home.description')"
      :ui="{ root: 'border-none' }"
    />
    <UPageBody>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <!-- Left column -->
        <div class="space-y-6">
          <UpcomingAppointmentsWidget />
          <ActionAppointmentsWidget />
        </div>

        <!-- Right column: stat cards -->
        <div class="space-y-4">
          <HomeEarnedTodayCard :earned="data?.earned" :loading="isLoading" />
          <HomeCompletedCountCard :count="data?.completed_count" :loading="isLoading" />
          <HomeWorkingHoursCard :minutes="data?.working_minutes" :loading="isLoading" />
        </div>
      </div>
    </UPageBody>
  </UPage>
</template>
