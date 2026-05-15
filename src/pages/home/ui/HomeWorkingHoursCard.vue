<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  minutes: number | null | undefined
  loading: boolean
}>()

const { t } = useI18n()

const label = computed(() => {
  if (props.minutes === null || props.minutes === undefined) return '—'
  const totalMinutes = props.minutes
  if (totalMinutes === 0) return `0 ${t('analytics.hoursUnit')}`
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (m === 0) return `${h} ${t('analytics.hoursUnit')}`
  return `${h} ${t('analytics.hoursUnit')} ${m} ${t('analytics.minutesUnit')}`
})
</script>

<template>
  <UPageCard
    variant="subtle"
    :ui="{ root: 'shadow-none' }"
  >
    <div class="space-y-2">
      <div class="flex items-center gap-2 text-muted">
        <UIcon name="i-lucide-clock" class="size-4" />
        <span class="text-xs font-medium uppercase">{{ t('home.workingHours') }}</span>
      </div>
      <div v-if="props.loading" class="h-7 w-20 animate-pulse rounded bg-elevated" />
      <p v-else class="text-2xl font-semibold">{{ label }}</p>
    </div>
  </UPageCard>
</template>
