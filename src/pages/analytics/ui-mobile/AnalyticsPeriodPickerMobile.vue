<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getLocalTimeZone, today } from '@internationalized/date'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonIcon,
  IonDatetime,
} from '@ionic/vue'
import { closeOutline } from 'ionicons/icons'
import type { AnalyticsAnchoredKind } from '@entities/analytics'
import { fromCalendarDate, mondayOf, toCalendarDate } from '@widgets/analytics/model/period-step'

// Jump-to-period sheet behind the stepper caption. The calendar follows the
// selected granularity: a day grid for day/week (the week of the tapped day is
// highlighted), a month-year wheel for month, a year wheel for year. Grid taps
// apply immediately; wheels scroll through values, so they apply on "Done".
const props = defineProps<{
  kind: AnalyticsAnchoredKind
  /** Anchor date (YYYY-MM-DD) of the current period. */
  date: string
}>()

const emit = defineEmits<{
  select: [date: string]
}>()

const isOpen = defineModel<boolean>('isOpen', { required: true })

const { locale } = useI18n()

const max = computed(() => fromCalendarDate(today(getLocalTimeZone())))
const isGrid = computed(() => props.kind === 'day' || props.kind === 'week')
const presentation = computed(() => {
  if (props.kind === 'month') return 'month-year'
  if (props.kind === 'year') return 'year'
  return 'date'
})

// Wheel selection waits for "Done"; reset it to the live period on every open.
const pending = ref(props.date)
watch(isOpen, (open) => {
  if (open) pending.value = props.date
})

function onChange(event: CustomEvent<{ value?: string | string[] | null }>) {
  const value = event.detail.value
  if (typeof value !== 'string') return
  pending.value = value.slice(0, 10)
  if (isGrid.value) apply()
}

function apply() {
  emit('select', pending.value)
  isOpen.value = false
}

// Tint the rest of the selected week so the grid reads as a week picker.
const weekRange = computed(() => {
  const start = mondayOf(toCalendarDate(pending.value))
  return { start: fromCalendarDate(start), end: fromCalendarDate(start.add({ days: 6 })) }
})

function highlightedDates(isoString: string) {
  if (props.kind !== 'week') return undefined
  const day = isoString.slice(0, 10)
  if (day < weekRange.value.start || day > weekRange.value.end) return undefined
  return {
    textColor: 'var(--ion-color-primary-shade)',
    backgroundColor: 'rgba(var(--ion-color-primary-rgb), 0.14)',
  }
}
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    class="period-picker"
    :breakpoints="[0, 1]"
    :initial-breakpoint="1"
    :handle="true"
    @did-dismiss="isOpen = false"
  >
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button
            fill="clear"
            color="dark"
            :aria-label="$t('common.close')"
            @click="isOpen = false"
          >
            <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ $t(`analytics.period.${kind}`) }}</ion-title>
        <ion-buttons v-if="!isGrid" slot="end">
          <ion-button :strong="true" @click="apply">{{ $t('common.done') }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <div class="period-picker__body">
      <ion-datetime
        :key="kind"
        :presentation="presentation"
        size="cover"
        :value="pending"
        :max="max"
        :locale="locale"
        :first-day-of-week="1"
        :highlighted-dates="highlightedDates"
        @ion-change="onChange"
      />
    </div>
  </ion-modal>
</template>

<style scoped>
.period-picker {
  --height: auto;
}

.period-picker ion-toolbar {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.period-picker__body {
  padding-bottom: calc(12px + var(--safe-area-bottom, 0px));
  background: var(--se-surface-page, var(--ion-background-color));
}

.period-picker ion-datetime {
  --background: transparent;
  /* The wheel fade defaults to --ion-color-light (a bluish light gray) and
     reads as a lighter band — fade into the sheet's own surface instead. */
  --background-rgb: var(--se-surface-page-rgb);
  --wheel-fade-background-rgb: var(--se-surface-page-rgb);
  --wheel-highlight-background: var(--se-surface-card, var(--ion-background-color));
  --wheel-highlight-border-radius: 12px;

  margin: 0 auto;
}
</style>
