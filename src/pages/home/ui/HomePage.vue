<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ActionAppointmentsWidget } from '@widgets/action-appointments'
import { HomeAnalyticsSummaryWidget } from '@widgets/home-analytics-summary'
import { UpcomingAppointmentsWidget } from '@widgets/upcoming-appointments'
import { HomeTodayWidget } from '@widgets/home'

const { t } = useI18n()
</script>

<template>
  <div class="flex-1 flex flex-col w-full">
    <div class="py-6">
      <UContainer>
        <div class="flex justify-between">
          <div class="flex flex-col gap-1.5">
            <h1 class="text-3xl font-bold">{{ t('home.title') }}</h1>
            <p class="text-neutral-500">{{ t('home.description') }}</p>
          </div>
          <div class="">

            <HomeTodayWidget/>
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

  <!--  <UTheme-->
  <!--    :ui="{-->
  <!--      page: { root: 'px-12 py-3 w-full max-w-[1460px] mx-auto' },-->
  <!--      pageHeader: { root: 'border-none pb-2' },-->
  <!--    }"-->
  <!--  >-->
  <!--    <UPage as="main">-->
  <!--      <UPageHeader-->
  <!--        :title="t('home.title')"-->
  <!--        :description="t('home.description')"-->
  <!--        :ui="{ root: 'border-none' }"-->
  <!--      />-->
  <!--      <UPageBody>-->
  <!--        <HomeAnalyticsSummaryWidget />-->
  <!--        <div class="grid grid-cols-3 gap-10">-->
  <!--          <div class="col-span-2">-->
  <!--            <ActionAppointmentsWidget />-->
  <!--          </div>-->

  <!--          <UpcomingAppointmentsWidget />-->
  <!--        </div>-->
  <!--      </UPageBody>-->
  <!--    </UPage>-->
  <!--  </UTheme>-->
</template>
