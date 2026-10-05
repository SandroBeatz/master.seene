<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getWeekDates } from '../model/calendar-mobile'

// iOS-style week strip above the day view: the seven days around the shown
// date, today in the accent colour, the shown date filled, a dot under days
// that hold appointments. Tapping a day switches the day view to it.
const props = defineProps<{
  /** Shown date, `YYYY-MM-DD`. */
  date: string
  today: string
  firstDay: number
  markedDates: ReadonlySet<string>
}>()

const emit = defineEmits<{ select: [date: string] }>()

const { locale } = useI18n()

const days = computed(() => {
  const weekday = new Intl.DateTimeFormat(locale.value, { weekday: 'short', timeZone: 'UTC' })
  return getWeekDates(props.date, props.firstDay).map((date) => ({
    date,
    weekday: weekday.format(new Date(`${date}T12:00:00Z`)).replace('.', ''),
    day: Number(date.slice(8, 10)),
  }))
})
</script>

<template>
  <div class="week-strip" role="tablist">
    <button
      v-for="day in days"
      :key="day.date"
      type="button"
      role="tab"
      class="week-strip__day ion-activatable"
      :class="{
        'week-strip__day--selected': day.date === date,
        'week-strip__day--today': day.date === today,
      }"
      :aria-selected="day.date === date"
      @click="day.date !== date && emit('select', day.date)"
    >
      <small>{{ day.weekday }}</small>
      <strong>{{ day.day }}</strong>
      <i :class="{ 'week-strip__dot--on': markedDates.has(day.date) }" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.week-strip {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 2px 8px 6px;
  border-bottom: 1px solid var(--se-separator);
  background: var(--se-surface-card);
}

.week-strip__day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 2px 0;
  border: 0;
  background: none;
  color: var(--ion-text-color);
  font: inherit;
  -webkit-tap-highlight-color: transparent;
}

.week-strip__day small {
  color: var(--ion-color-medium);
  font-size: 0.66rem;
  font-weight: 600;
  text-transform: capitalize;
}

.week-strip__day strong {
  display: grid;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  place-items: center;
  transition:
    background-color 180ms ease,
    color 180ms ease,
    transform 180ms ease;
}

.week-strip__day.ion-activated strong {
  transform: scale(0.92);
}

.week-strip__day--today strong {
  color: var(--ion-color-primary);
}

.week-strip__day--selected strong {
  background: var(--ion-text-color);
  color: var(--se-surface-card);
}

.week-strip__day--selected.week-strip__day--today strong {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}

.week-strip__day i {
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: transparent;
}

.week-strip__day i.week-strip__dot--on {
  background: var(--ion-color-medium);
}

@media (prefers-reduced-motion: reduce) {
  .week-strip__day strong {
    transition: none;
  }
}
</style>
