<script setup lang="ts">
import { UpcomingAppointmentsWidget } from '@widgets/upcoming-appointments'
import {
  HomeTodayWidget,
  HomeUserWidget,
  HomeOverviewWidget,
  HomeNextUpWidget,
} from '@widgets/home'
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

    <div class="space-y-6">
      <HomeOverviewWidget />
      <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,0.8fr)]">
        <HomeNextUpWidget />
        <UpcomingAppointmentsWidget />
      </div>
    </div>
  </Page>
</template>
