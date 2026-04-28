<script setup lang="ts">
import { CalendarWidget } from '@widgets/calendar'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <UTheme
    :ui="{
      page: {
        root: 'px-12 w-full max-w-7xl mx-auto',
      },
      pageHeader: {
        root: 'border-none',
      },
    }"
  >
    <UPage as="main">
      <UPageHeader :title="t('calendar.title')" :description="t('calendar.description')" />
      <UPageBody>
        <UPageCard>
          <div class="min-h-[700px]">
            <CalendarWidget />
          </div>
        </UPageCard>
      </UPageBody>
    </UPage>
  </UTheme>
</template>
