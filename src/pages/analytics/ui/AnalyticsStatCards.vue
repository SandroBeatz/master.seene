<script setup lang="ts">
import type { AnalyticsResult } from '@entities/analytics'
import { useFormats } from '@shared/lib/formats'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const props = defineProps<{
  data: AnalyticsResult | null | undefined
  loading: boolean
}>()

const { t } = useI18n()
const formats = useFormats()

const workingHoursLabel = computed(() => {
  if (!props.data) return '—'
  const totalMinutes = props.data.working_minutes
  if (totalMinutes === 0) return `0 ${t('analytics.hoursUnit')}`
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (m === 0) return `${h} ${t('analytics.hoursUnit')}`
  return `${h} ${t('analytics.hoursUnit')} ${m} ${t('analytics.minutesUnit')}`
})

const cards = computed(() => [
  {
    key: 'earned',
    label: t('analytics.earned'),
    value: formats.price(props.data?.earned ?? 0),
    icon: 'i-lucide-banknote',
  },
  {
    key: 'completed',
    label: t('analytics.completedCount'),
    value: props.data?.completed_count ?? 0,
    icon: 'i-lucide-calendar-check',
  },
  {
    key: 'hours',
    label: t('analytics.workingHours'),
    value: workingHoursLabel.value,
    icon: 'i-lucide-clock',
  },
  {
    key: 'avg',
    label: t('analytics.avgCheck'),
    value: props.data?.avg_check != null ? formats.price(props.data.avg_check) : '—',
    icon: 'i-lucide-trending-up',
  },
])
</script>

<template>
  <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
    <UPageCard
      v-for="card in cards"
      :key="card.key"
      variant="subtle"
      :ui="{ root: 'shadow-none' }"
    >
      <div class="space-y-2">
        <div class="flex items-center gap-2 text-muted">
          <UIcon :name="card.icon" class="size-4" />
          <span class="text-xs font-medium uppercase">{{ card.label }}</span>
        </div>
        <div v-if="loading" class="h-7 w-24 animate-pulse rounded bg-elevated" />
        <p v-else class="text-2xl font-semibold">{{ card.value }}</p>
      </div>
    </UPageCard>
  </div>
</template>
