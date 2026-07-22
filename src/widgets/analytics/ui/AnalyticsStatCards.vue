<script setup lang="ts">
import type { AnalyticsResultV2 } from '@entities/analytics'
import { useFormats } from '@shared/lib/formats'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { AnimatedNumber } from '@shared/ui'
import { deltaPct, workingHoursLabel } from '../lib/stat-format'

const props = defineProps<{
  data: AnalyticsResultV2 | null | undefined
  loading: boolean
  compare: boolean
  /** "vs last month" — the comparison period caption under the label. */
  compareLabel: string
}>()

const { t } = useI18n()
const formats = useFormats()

interface Card {
  key: string
  label: string
  icon: string
  iconClass: string
  iconBgClass: string
  value: string | number
  current: number
  previous: number
  secondary?: string
  /** 'earned' animates through AnimatedNumber; the rest render `value` as plain text. */
  money?: boolean
}

const priceParts = computed(() => formats.priceParts())

const cards = computed<Card[]>(() => {
  const cur = props.data?.current
  const prev = props.data?.previous
  return [
    {
      key: 'earned',
      label: t('analytics.totalEarned'),
      icon: 'i-lucide-banknote',
      iconClass: 'text-green-600 dark:text-green-400',
      iconBgClass: 'bg-green-100 dark:bg-green-900/30',
      value: cur?.earned ?? 0,
      current: cur?.earned ?? 0,
      previous: prev?.earned ?? 0,
      secondary: `${t('analytics.avgCheckInline')} ${
        cur?.avg_check != null ? formats.price(cur.avg_check) : '—'
      }`,
      money: true,
    },
    {
      key: 'clients',
      label: t('analytics.clientsServed'),
      icon: 'i-lucide-users',
      iconClass: 'text-violet-600 dark:text-violet-400',
      iconBgClass: 'bg-violet-100 dark:bg-violet-900/30',
      value: cur?.clients_served ?? 0,
      current: cur?.clients_served ?? 0,
      previous: prev?.clients_served ?? 0,
    },
    {
      key: 'hours',
      label: t('analytics.hoursWorked'),
      icon: 'i-lucide-clock',
      iconClass: 'text-amber-600 dark:text-amber-400',
      iconBgClass: 'bg-amber-100 dark:bg-amber-900/30',
      value: workingHoursLabel(cur?.working_minutes ?? 0, t),
      current: cur?.working_minutes ?? 0,
      previous: prev?.working_minutes ?? 0,
    },
    {
      key: 'appointments',
      label: t('analytics.appointments'),
      icon: 'i-lucide-calendar-check',
      iconClass: 'text-blue-600 dark:text-blue-400',
      iconBgClass: 'bg-blue-100 dark:bg-blue-900/30',
      value: cur?.appointments_count ?? 0,
      current: cur?.appointments_count ?? 0,
      previous: prev?.appointments_count ?? 0,
    },
  ]
})
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <UCard v-for="card in cards" :key="card.key" :ui="{ root: 'shadow-panel ring-0' }">
      <div class="space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div
            class="flex size-11 shrink-0 items-center justify-center rounded-lg"
            :class="card.iconBgClass"
          >
            <UIcon :name="card.icon" class="size-5" :class="card.iconClass" />
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
              {{ deltaPct(card.current, card.previous)! > 0 ? '+' : ''
              }}{{ deltaPct(card.current, card.previous) }}%
            </UBadge>
            <UBadge v-else color="neutral" variant="subtle" size="sm">
              {{ t('analytics.deltaNew') }}
            </UBadge>
          </template>
        </div>

        <div v-if="loading" class="space-y-1.5">
          <USkeleton class="h-7 w-24" />
          <USkeleton class="h-4 w-20" />
        </div>
        <div v-else class="space-y-0.5">
          <p class="text-2xl font-semibold">
            <AnimatedNumber
              v-if="card.money"
              :value="card.current"
              :format="priceParts.format"
              :prefix="priceParts.prefix"
              :suffix="priceParts.suffix"
            />
            <template v-else>{{ card.value }}</template>
          </p>
          <p class="text-sm font-medium">{{ card.label }}</p>
          <p v-if="compare || card.secondary" class="text-xs text-muted">
            {{ compare ? compareLabel : card.secondary }}
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>
