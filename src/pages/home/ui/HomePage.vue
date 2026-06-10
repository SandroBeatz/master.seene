<script setup lang="ts">
import { ActionAppointmentsWidget } from '@widgets/action-appointments'
import { UpcomingAppointmentsWidget } from '@widgets/upcoming-appointments'
import { HomeTodayWidget, HomeUserWidget, HomeOverviewWidget } from '@widgets/home'
import { Page } from '@shared/ui'
</script>

<template>
  <Page>
    <template #header-left>
      <HomeUserWidget />
    </template>
    <template #header-right>
      <HomeTodayWidget />
    </template>

    <HomeOverviewWidget />
    <div class="grid grid-cols-3 gap-10 mt-6">
      <div class="col-span-2">
        <ActionAppointmentsWidget />
      </div>
      <UpcomingAppointmentsWidget />
    </div>
  </Page>
</template>
