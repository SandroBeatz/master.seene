<script setup lang="ts">
import type { AnalyticsPeriod } from '@entities/analytics'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const model = defineModel<AnalyticsPeriod>({ required: true })
const { t } = useI18n()

const tabs = computed(() => [
  { label: t('analytics.period.today'), value: 'today' as AnalyticsPeriod },
  { label: t('analytics.period.week'), value: 'week' as AnalyticsPeriod },
  { label: t('analytics.period.month'), value: 'month' as AnalyticsPeriod },
])
</script>

<template>
  <div class="inline-flex gap-1 rounded-xl bg-elevated p-1">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      class="rounded-lg px-5 py-1.5 text-sm font-medium transition-colors"
      :class="
        model === tab.value
          ? 'bg-default text-highlighted shadow-sm'
          : 'text-muted hover:text-default'
      "
      @click="model = tab.value"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
