<script setup lang="ts">
import type { AnalyticsResultV2 } from '@entities/analytics'
import { useFormats } from '@shared/lib/formats'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const props = defineProps<{
  data: AnalyticsResultV2 | null | undefined
  loading: boolean
  compare: boolean
}>()

const { t } = useI18n()
const formats = useFormats()

function workingHoursLabel(minutes: number): string {
  if (minutes === 0) return `0 ${t('analytics.hoursUnit')}`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h} ${t('analytics.hoursUnit')}`
  return `${h} ${t('analytics.hoursUnit')} ${m} ${t('analytics.minutesUnit')}`
}

/** Percentage change vs the previous period. `null` when there's no baseline. */
function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

interface Card {
  key: string
  label: string
  icon: string
  value: string | number
  current: number
  previous: number
  secondary?: string
}

const cards = computed<Card[]>(() => {
  const cur = props.data?.current
  const prev = props.data?.previous
  return [
    {
      key: 'earned',
      label: t('analytics.totalEarned'),
      icon: 'i-lucide-banknote',
      value: formats.price(cur?.earned ?? 0),
      current: cur?.earned ?? 0,
      previous: prev?.earned ?? 0,
      secondary: `${t('analytics.avgCheckInline')} ${
        cur?.avg_check != null ? formats.price(cur.avg_check) : '—'
      }`,
    },
    {
      key: 'clients',
      label: t('analytics.clientsServed'),
      icon: 'i-lucide-users',
      value: cur?.clients_served ?? 0,
      current: cur?.clients_served ?? 0,
      previous: prev?.clients_served ?? 0,
    },
    {
      key: 'hours',
      label: t('analytics.hoursWorked'),
      icon: 'i-lucide-clock',
      value: workingHoursLabel(cur?.working_minutes ?? 0),
      current: cur?.working_minutes ?? 0,
      previous: prev?.working_minutes ?? 0,
    },
    {
      key: 'appointments',
      label: t('analytics.appointments'),
      icon: 'i-lucide-calendar-check',
      value: cur?.appointments_count ?? 0,
      current: cur?.appointments_count ?? 0,
      previous: prev?.appointments_count ?? 0,
    },
  ]
})
</script>

<template>
  <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
    <UCard v-for="card in cards" :key="card.key" :ui="{ root: 'shadow-panel ring-0' }">
      <div class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 text-muted">
            <UIcon :name="card.icon" class="size-4" />
            <span class="text-xs font-medium uppercase">{{ card.label }}</span>
          </div>
          <template v-if="compare && data && !loading">
            <UBadge
              v-if="deltaPct(card.current, card.previous) !== null"
              :color="deltaPct(card.current, card.previous)! >= 0 ? 'success' : 'error'"
              variant="subtle"
              size="sm"
              :icon="
                deltaPct(card.current, card.previous)! >= 0
                  ? 'i-lucide-trending-up'
                  : 'i-lucide-trending-down'
              "
            >
              {{ (deltaPct(card.current, card.previous)! > 0 ? '+' : '') }}{{
                deltaPct(card.current, card.previous)
              }}%
            </UBadge>
            <UBadge v-else color="neutral" variant="subtle" size="sm">
              {{ t('analytics.deltaNew') }}
            </UBadge>
          </template>
        </div>

        <div v-if="loading" class="h-7 w-24 animate-pulse rounded bg-elevated" />
        <template v-else>
          <p class="text-2xl font-semibold">{{ card.value }}</p>
          <p v-if="card.secondary" class="text-xs text-muted">{{ card.secondary }}</p>
        </template>
      </div>
    </UCard>
  </div>
</template>
