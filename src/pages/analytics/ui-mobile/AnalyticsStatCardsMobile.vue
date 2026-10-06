<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonIcon, IonBadge, IonSkeletonText } from '@ionic/vue'
import {
  cashOutline,
  peopleOutline,
  timeOutline,
  calendarClearOutline,
  trendingUpOutline,
  trendingDownOutline,
} from 'ionicons/icons'
import type { AnalyticsResultV2 } from '@entities/analytics'
import { useFormats } from '@shared/lib/formats'
// Pure formatting helpers shared with the desktop stat cards (no Nuxt UI).
import { deltaPct, workingHoursLabel } from '@widgets/analytics/lib/stat-format'

const props = defineProps<{
  data: AnalyticsResultV2 | null | undefined
  loading: boolean
  compare: boolean
  /** "vs last month" — the comparison-period caption shown under each value. */
  compareLabel: string
}>()

const { t } = useI18n()
const formats = useFormats()

interface Card {
  key: string
  label: string
  icon: string
  /** Ionic semantic color for the icon chip — defined in both palettes. */
  color: 'success' | 'tertiary' | 'warning' | 'secondary'
  value: string
  current: number
  previous: number
  /** Comparison-period value, formatted like `value` — shown when comparing. */
  previousDisplay: string
  /** Extra caption shown when not comparing (e.g. avg check). */
  secondary?: string
}

const cards = computed<Card[]>(() => {
  const cur = props.data?.current
  const prev = props.data?.previous
  return [
    {
      key: 'earned',
      label: t('analytics.totalEarned'),
      icon: cashOutline,
      color: 'success',
      value: formats.price(cur?.earned ?? 0),
      current: cur?.earned ?? 0,
      previous: prev?.earned ?? 0,
      previousDisplay: formats.price(prev?.earned ?? 0),
      secondary: `${t('analytics.avgCheckInline')} ${
        cur?.avg_check != null ? formats.price(cur.avg_check) : '—'
      }`,
    },
    {
      key: 'clients',
      label: t('analytics.clientsServed'),
      icon: peopleOutline,
      color: 'tertiary',
      value: String(cur?.clients_served ?? 0),
      current: cur?.clients_served ?? 0,
      previous: prev?.clients_served ?? 0,
      previousDisplay: String(prev?.clients_served ?? 0),
    },
    {
      key: 'hours',
      label: t('analytics.hoursWorked'),
      icon: timeOutline,
      color: 'warning',
      value: workingHoursLabel(cur?.working_minutes ?? 0, t),
      current: cur?.working_minutes ?? 0,
      previous: prev?.working_minutes ?? 0,
      previousDisplay: workingHoursLabel(prev?.working_minutes ?? 0, t),
    },
    {
      key: 'appointments',
      label: t('analytics.appointments'),
      icon: calendarClearOutline,
      color: 'secondary',
      value: String(cur?.appointments_count ?? 0),
      current: cur?.appointments_count ?? 0,
      previous: prev?.appointments_count ?? 0,
      previousDisplay: String(prev?.appointments_count ?? 0),
    },
  ]
})
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <div v-for="card in cards" :key="card.key" class="stat-card">
      <div class="flex items-start justify-between gap-2">
        <div class="chip" :style="{ background: `rgba(var(--ion-color-${card.color}-rgb), 0.15)` }">
          <ion-icon :icon="card.icon" :style="{ color: `var(--ion-color-${card.color})` }" />
        </div>
        <template v-if="compare && data && !loading">
          <ion-badge
            v-if="deltaPct(card.current, card.previous) !== null"
            :color="deltaPct(card.current, card.previous)! >= 0 ? 'success' : 'danger'"
          >
            <ion-icon
              :icon="
                deltaPct(card.current, card.previous)! >= 0 ? trendingUpOutline : trendingDownOutline
              "
            />
            {{ deltaPct(card.current, card.previous)! > 0 ? '+' : ''
            }}{{ deltaPct(card.current, card.previous) }}%
          </ion-badge>
          <ion-badge v-else color="medium">{{ t('analytics.deltaNew') }}</ion-badge>
        </template>
      </div>

      <div v-if="loading" class="mt-3 space-y-2">
        <ion-skeleton-text :animated="true" style="width: 70%; height: 22px" />
        <ion-skeleton-text :animated="true" style="width: 50%; height: 14px" />
      </div>
      <div v-else class="mt-3">
        <p class="value">{{ card.value }}</p>
        <p class="label">{{ card.label }}</p>
        <p v-if="compare" class="muted mt-0.5 truncate text-xs">
          {{ compareLabel }}: <span class="font-medium">{{ card.previousDisplay }}</span>
        </p>
        <p v-else-if="card.secondary" class="muted mt-0.5 truncate text-xs">
          {{ card.secondary }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  background: var(--se-surface-card);
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.chip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  flex-shrink: 0;
}

.chip ion-icon {
  font-size: 19px;
}

.value {
  font-size: 1.35rem;
  font-weight: 600;
  line-height: 1.15;
}

.label {
  font-size: 0.8rem;
  font-weight: 500;
  margin-top: 2px;
}

.muted {
  color: var(--ion-color-medium);
}

ion-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-weight: 600;
}

ion-badge ion-icon {
  font-size: 12px;
}
</style>
