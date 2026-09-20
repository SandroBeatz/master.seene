<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonButton, IonCard, IonCardContent, IonIcon, IonSkeletonText } from '@ionic/vue'
import {
  alertCircleOutline,
  calendarOutline,
  calendarClearOutline,
  cashOutline,
  chevronDownOutline,
  todayOutline,
  timeOutline,
} from 'ionicons/icons'
import { useAnalyticsQueryV2 } from '@entities/analytics'
import { useFormats } from '@shared/lib/formats'
import { ListPickerModal } from '@shared/ui/list-picker-modal/index.mobile'
import { workingHoursLabel } from '@widgets/analytics/lib/stat-format'
import {
  createHomeOverviewPeriod,
  formatHomeOverviewPeriodLabel,
  HOME_OVERVIEW_PERIODS,
  type HomeOverviewPeriod,
} from '../model/home-overview'

const { t } = useI18n()
const formats = useFormats()
const anchorDate = new Date()

const activePeriod = ref<HomeOverviewPeriod>('day')
const analyticsPeriod = computed(() => createHomeOverviewPeriod(activePeriod.value, anchorDate))
const { data, isPending, isPlaceholderData, error, refetch } = useAnalyticsQueryV2(analyticsPeriod)

const isPeriodSheetOpen = ref(false)
const showInitialError = computed(() => Boolean(error.value) && !data.value)
const periodLabel = computed(() =>
  formatHomeOverviewPeriodLabel(activePeriod.value, anchorDate, formats),
)
const activePeriodLabel = computed(() => t(`home.overview.period.${activePeriod.value}`))
const periodItems = computed(() => [
  { value: 'day', label: t('home.overview.period.day'), icon: todayOutline },
  { value: 'week', label: t('home.overview.period.week'), icon: calendarClearOutline },
  { value: 'month', label: t('home.overview.period.month'), icon: calendarOutline },
])

const cards = computed(() => {
  const metrics = data.value?.current

  return [
    {
      key: 'earned',
      label: t('home.overview.earnedToday'),
      icon: cashOutline,
      color: 'success',
      value: formats.price(metrics?.earned ?? 0),
    },
    {
      key: 'appointments',
      label: t('home.overview.appointments'),
      icon: calendarClearOutline,
      color: 'tertiary',
      value: formats.decimal(metrics?.appointments_count ?? 0, 0),
    },
    {
      key: 'hours',
      label: t('home.overview.workingHours'),
      icon: timeOutline,
      color: 'warning',
      value: workingHoursLabel(metrics?.working_minutes ?? 0, t),
    },
  ]
})

function selectPeriod(period: HomeOverviewPeriod) {
  activePeriod.value = period
  isPeriodSheetOpen.value = false
}

function onPeriodSelected(value: string | number) {
  if (HOME_OVERVIEW_PERIODS.includes(value as HomeOverviewPeriod)) {
    selectPeriod(value as HomeOverviewPeriod)
  }
}

function retry() {
  void refetch()
}
</script>

<template>
  <ion-card class="overview-card">
    <div class="overview-header">
      <h2 class="overview-title">{{ periodLabel }}</h2>
      <ion-button
        class="period-button"
        fill="clear"
        size="small"
        :aria-label="t('home.overview.periodLabel')"
        @click="isPeriodSheetOpen = true"
      >
        {{ activePeriodLabel }}
        <ion-icon slot="end" :icon="chevronDownOutline" aria-hidden="true" />
      </ion-button>
    </div>

    <ion-card-content>
      <div v-if="showInitialError" class="overview-error" role="alert">
        <ion-icon :icon="alertCircleOutline" color="danger" aria-hidden="true" />
        <span>{{ t('analytics.loadError') }}</span>
        <ion-button fill="clear" size="small" @click="retry">
          {{ t('analytics.retry') }}
        </ion-button>
      </div>

      <div
        v-else
        class="overview-metrics"
        :class="{ 'overview-metrics--refreshing': isPlaceholderData }"
        :aria-busy="isPending || isPlaceholderData"
      >
        <article v-for="card in cards" :key="card.key" class="metric-card">
          <div
            class="metric-icon"
            :style="{ background: `rgba(var(--ion-color-${card.color}-rgb), 0.15)` }"
          >
            <ion-icon
              :icon="card.icon"
              :style="{ color: `var(--ion-color-${card.color})` }"
              aria-hidden="true"
            />
          </div>

          <p class="metric-label">{{ card.label }}</p>
          <ion-skeleton-text v-if="isPending" :animated="true" class="metric-skeleton" />
          <p v-else class="metric-value" :title="card.value">{{ card.value }}</p>
        </article>
      </div>
    </ion-card-content>
  </ion-card>

  <list-picker-modal
    :is-open="isPeriodSheetOpen"
    :title="t('home.overview.periodLabel')"
    :items="periodItems"
    :model-value="activePeriod"
    sheet
    @update:is-open="isPeriodSheetOpen = $event"
    @update:model-value="onPeriodSelected"
  />
</template>

<style scoped>
.overview-card {
  margin: 0;
  border-radius: 16px;
  background: var(--se-surface-card);
  box-shadow: 0 1px 3px rgb(0 0 0 / 6%);
}

.overview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 52px;
  padding: 8px 8px 4px 14px;
}

.overview-title {
  overflow: hidden;
  min-width: 0;
  margin: 0;
  color: var(--ion-text-color);
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.period-button {
  --background: var(--ion-background-color-step-100);
  --background-activated: var(--ion-background-color-step-200);
  --border-radius: 999px;
  --color: var(--ion-text-color);
  --padding-start: 12px;
  --padding-end: 10px;

  flex: 0 0 auto;
  min-height: 34px;
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: none;
}

.period-button ion-icon {
  margin-inline-start: 6px;
  font-size: 0.9rem;
}

ion-card-content {
  padding: 6px 10px 10px;
}

.overview-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  transition: opacity 0.2s ease;
}

.overview-metrics--refreshing {
  opacity: 0.6;
}

.metric-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  padding: 10px 8px 11px;
  border-radius: 11px;
  background: var(--se-surface-muted, var(--ion-background-color-step-100));
}

.metric-icon {
  display: flex;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  align-items: center;
  justify-content: center;
  margin-bottom: 7px;
  border-radius: 8px;
}

.metric-icon ion-icon {
  font-size: 16px;
}

.metric-label,
.metric-value {
  max-width: 100%;
  margin: 0;
}

.metric-label {
  display: -webkit-box;
  overflow: hidden;
  color: var(--ion-color-medium);
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.1;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.metric-value {
  overflow: hidden;
  margin-top: 4px;
  color: var(--ion-text-color);
  font-size: clamp(0.88rem, 3.8vw, 1.08rem);
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-skeleton {
  width: 72%;
  height: 20px;
  margin-top: 4px;
  border-radius: 5px;
}

.overview-error {
  display: flex;
  min-height: 112px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--ion-color-medium);
  font-size: 0.82rem;
  text-align: center;
}

.overview-error > ion-icon {
  font-size: 24px;
}

.overview-error ion-button {
  margin-bottom: -6px;
}
</style>
