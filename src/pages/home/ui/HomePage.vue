<script setup lang="ts">
import { ActionAppointmentsWidget } from '@widgets/action-appointments'
import { HomeAnalyticsSummaryWidget } from '@widgets/home-analytics-summary'
import { UpcomingAppointmentsWidget } from '@widgets/upcoming-appointments'
import { HomeTodayWidget, HomeUserWidget } from '@widgets/home'
</script>

<template>
  <div class="flex-1 flex flex-col w-full">
    <div class="py-8">
      <UContainer>
        <div class="flex justify-between">
          <div class="">
            <HomeUserWidget />
          </div>
          <div class="">
            <HomeTodayWidget />
          </div>
        </div>
      </UContainer>
    </div>
    <div class="">
      <UContainer>
        <HomeAnalyticsSummaryWidget />
        <div class="grid grid-cols-3 gap-10">
          <div class="col-span-2">
            <ActionAppointmentsWidget />
          </div>

          <UpcomingAppointmentsWidget />
        </div>
      </UContainer>
    </div>
  </div>
</template>
