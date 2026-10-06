<script setup lang="ts">
import { addDateInputDays } from '@shared/lib/time-zone'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getWeekDates } from '../model/calendar-mobile'

// iOS-style week strip above the day view: today in the accent colour, the
// shown date filled, a dot under days that hold appointments. Tapping a day
// switches the day view to it; swiping the strip pages whole weeks and keeps
// the same weekday selected. It renders the previous, current and next week
// side by side and re-centres on the middle one after every page.
const props = defineProps<{
  /** Shown date, `YYYY-MM-DD`. */
  date: string
  today: string
  firstDay: number
  markedDates: ReadonlySet<string>
}>()

const emit = defineEmits<{ select: [date: string] }>()

const { locale } = useI18n()
const scrollerRef = ref<HTMLElement | null>(null)

const WEEK_OFFSETS = [-7, 0, 7] as const
const SETTLE_DELAY_MS = 90

const weeks = computed(() => {
  const weekday = new Intl.DateTimeFormat(locale.value, { weekday: 'short', timeZone: 'UTC' })
  return WEEK_OFFSETS.map((offset) =>
    getWeekDates(addDateInputDays(props.date, offset), props.firstDay).map((date) => ({
      date,
      weekday: weekday.format(new Date(`${date}T12:00:00Z`)).replace('.', ''),
      day: Number(date.slice(8, 10)),
    })),
  )
})

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function centre() {
  const el = scrollerRef.value
  if (el) el.scrollLeft = el.clientWidth
}

// The scroll has settled once no scroll event arrived for a moment and no
// finger is down; landing on a side week pages to it.
let touching = false
let pagedTo: string | null = null
let settleTimer: ReturnType<typeof setTimeout> | undefined

function settle() {
  const el = scrollerRef.value
  if (!el || touching || !el.clientWidth) return
  const page = Math.round(el.scrollLeft / el.clientWidth)
  if (page === 1) return
  pagedTo = addDateInputDays(props.date, page === 0 ? -7 : 7)
  emit('select', pagedTo)
}

function onScroll() {
  clearTimeout(settleTimer)
  settleTimer = setTimeout(settle, SETTLE_DELAY_MS)
}

function onTouchStart() {
  touching = true
}

function onTouchEnd() {
  touching = false
  onScroll()
}

// After a new date the middle page holds its week. When the week changed
// from outside (day swipe, tap on another day) the strip glides from the old
// week; after a strip swipe it just re-centres without a visible jump.
// (Chrome may already have re-snapped to the same week node by then, so the
// origin is remembered rather than read back from the scroll position.)
watch(
  () => props.date,
  (date, previous) => {
    const el = scrollerRef.value
    const fromStrip = date === pagedTo
    pagedTo = null
    if (!el) return
    const weekShift = Math.sign(
      getWeekDates(date, props.firstDay)[0]!.localeCompare(
        getWeekDates(previous, props.firstDay)[0]!,
      ),
    )
    if (!weekShift || fromStrip || prefersReducedMotion()) return centre()

    el.scrollLeft = weekShift > 0 ? 0 : el.clientWidth * 2
    el.scrollTo({ left: el.clientWidth, behavior: 'smooth' })
  },
  { flush: 'post' },
)

const resizeObserver = new ResizeObserver(centre)
onMounted(() => {
  centre()
  if (scrollerRef.value) resizeObserver.observe(scrollerRef.value)
})
onBeforeUnmount(() => {
  clearTimeout(settleTimer)
  resizeObserver.disconnect()
})
</script>

<template>
  <div
    ref="scrollerRef"
    class="week-strip"
    @scroll.passive="onScroll"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
    @touchcancel.passive="onTouchEnd"
  >
    <div
      v-for="(week, index) in weeks"
      :key="week[0]!.date"
      class="week-strip__week"
      role="tablist"
      :aria-hidden="index !== 1"
    >
      <button
        v-for="day in week"
        :key="day.date"
        type="button"
        role="tab"
        class="week-strip__day ion-activatable"
        :class="{
          'week-strip__day--selected': day.date === date,
          'week-strip__day--today': day.date === today,
        }"
        :aria-selected="day.date === date"
        :tabindex="index === 1 ? 0 : -1"
        @click="day.date !== date && emit('select', day.date)"
      >
        <small>{{ day.weekday }}</small>
        <strong>{{ day.day }}</strong>
        <i :class="{ 'week-strip__dot--on': markedDates.has(day.date) }" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.week-strip {
  display: flex;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  border-bottom: 1px solid var(--se-separator);
  background: var(--se-surface-card);
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.week-strip::-webkit-scrollbar {
  display: none;
}

.week-strip__week {
  display: grid;
  flex: 0 0 100%;
  grid-template-columns: repeat(7, 1fr);
  padding: 2px 8px 6px;
  scroll-snap-align: start;
  scroll-snap-stop: always;
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
