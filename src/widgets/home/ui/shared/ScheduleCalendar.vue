<script setup lang="ts">
import { computed, ref, toRef, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useLocaleStore } from '@shared/lib/locale'
import { useAppointmentDayCountsQuery, type AppointmentDayCountsRange } from '@entities/appointment'
import { Typography } from '@shared/ui'
import ScheduleCalendarItem from './ScheduleCalendarItem.vue'

const { t } = useI18n()
const router = useRouter()
const localeStore = useLocaleStore()
const model = defineModel<Date>({ required: true })
const emit = defineEmits<{
  visibleDateChange: [date: Date]
}>()
const props = withDefaults(
  defineProps<{
    userId: string
    timeZone: string
    embedded?: boolean
  }>(),
  {
    embedded: false,
  },
)

interface ScheduleCalendarDayItem {
  kind: 'day'
  date: Date
  label: string
  dayNum: string
  isToday: boolean
}

interface ScheduleCalendarMoreItem {
  kind: 'more'
}

type CalendarItem = ScheduleCalendarDayItem | ScheduleCalendarMoreItem

// One month window, fully materialised so the user can swipe to the last day in one go.
const DAYS_TOTAL = 30

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const today = startOfToday()

const days = computed<ScheduleCalendarDayItem[]>(() => {
  const weekdayFmt = new Intl.DateTimeFormat(localeStore.current, { weekday: 'short' })
  return Array.from({ length: DAYS_TOTAL }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    return {
      kind: 'day' as const,
      date,
      label: weekdayFmt.format(date),
      dayNum: String(date.getDate()),
      isToday: i === 0,
    }
  })
})

const items = computed<CalendarItem[]>(() => [...days.value, { kind: 'more' }])

// Busy-dots: per-day appointment counts over the same [today, today+30d) window.
const MAX_DOTS = 3

const countsRange = computed<AppointmentDayCountsRange>(() => {
  const to = new Date(today)
  to.setDate(today.getDate() + DAYS_TOTAL)
  return { from: today.toISOString(), to: to.toISOString(), timeZone: props.timeZone }
})

const { data: dayCounts } = useAppointmentDayCountsQuery(toRef(props, 'userId'), countsRange)

// Keyed by local 'YYYY-MM-DD' (assumes the browser timezone matches the master's,
// which is the common case; the day cells themselves are built in local time).
const countsByDay = computed(() => {
  const map = new Map<string, number>()
  for (const row of dayCounts.value ?? []) map.set(row.day, row.cnt)
  return map
})

function dateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function appointmentDots(date: Date): number {
  return Math.min(countsByDay.value.get(dateKey(date)) ?? 0, MAX_DOTS)
}

// Index of the leading visible slide; drives the month/year header.
const leadingIndex = ref(0)

const monthYearLabel = computed(() => {
  const date = days.value[Math.min(leadingIndex.value, days.value.length - 1)]?.date ?? today
  return new Intl.DateTimeFormat(localeStore.current, { month: 'long', year: 'numeric' }).format(
    date,
  )
})

const carousel = useTemplateRef('carousel')

// Index of the currently selected day within the window (-1 if outside it).
const selectedIndex = computed(() => days.value.findIndex((d) => isSameDay(d.date, model.value)))

function setLeadingIndex(index: number) {
  if (index === leadingIndex.value) return

  const day = days.value[index]
  if (!day) return

  leadingIndex.value = index
  emit('visibleDateChange', day.date)
}

function onSelect() {
  const api = carousel.value?.emblaApi
  if (!api) return
  // Track the first slide actually in view so the month header follows the swipe.
  const first = api.slidesInView()[0]
  if (first !== undefined) setLeadingIndex(first)
}

function onMobileScroll(event: Event) {
  const container = event.currentTarget as HTMLElement
  const containerLeft = container.getBoundingClientRect().left
  const dayElements = container.querySelectorAll<HTMLElement>('[data-day-index]')

  for (const element of dayElements) {
    if (element.getBoundingClientRect().right <= containerLeft + 1) continue

    const index = Number(element.dataset.dayIndex)
    if (Number.isFinite(index)) setLeadingIndex(index)
    return
  }
}

// Move the selection to a day and keep it on screen if it scrolled out of view.
function selectDay(index: number) {
  const day = days.value[index]
  if (!day) return
  model.value = day.date
  const api = carousel.value?.emblaApi
  if (api && !api.slidesInView().includes(index)) api.scrollTo(index)
}

function goPrev() {
  if (selectedIndex.value > 0) selectDay(selectedIndex.value - 1)
}

function goNext() {
  if (selectedIndex.value < 0) selectDay(0)
  else if (selectedIndex.value < days.value.length - 1) selectDay(selectedIndex.value + 1)
}

function openCalendar() {
  router.push({ name: 'calendar' })
}

function selectDate(date: Date) {
  model.value = date
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// Nuxt UI card overrides
const hostUI = {
  root: 'w-full min-w-0 max-w-full overflow-hidden rounded-lg shadow-panel ring-0 divide-y-0 md:rounded-xl',
  header: 'min-w-0 pb-0',
  body: 'min-w-0 overflow-hidden',
}

const resolvedHostUI = computed(() =>
  props.embedded
    ? {
        root: 'w-full min-w-0 max-w-full rounded-none bg-transparent! shadow-none ring-0 divide-y-0',
        body: 'min-w-0 overflow-hidden p-0! sm:p-0!',
      }
    : hostUI,
)
</script>

<template>
  <UCard :ui="resolvedHostUI">
    <template v-if="!embedded" #header>
      <div class="flex items-center justify-between">
        <Typography variant="h5" class="text-highlighted font-bold">{{
          monthYearLabel
        }}</Typography>
        <div class="hidden items-center gap-1 md:flex">
          <UButton
            color="neutral"
            variant="soft"
            size="sm"
            icon="i-lucide-chevron-left"
            :disabled="selectedIndex <= 0"
            :aria-label="t('home.upcoming.prevDay')"
            @click="goPrev"
          />
          <UButton
            color="neutral"
            variant="soft"
            size="sm"
            icon="i-lucide-chevron-right"
            :disabled="selectedIndex === days.length - 1"
            :aria-label="t('home.upcoming.nextDay')"
            @click="goNext"
          />
        </div>
      </div>
    </template>

    <div
      class="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
      @scroll.passive="onMobileScroll"
    >
      <div
        v-for="(item, index) in items"
        :key="item.kind === 'day' ? dateKey(item.date) : item.kind"
        class="w-16 flex-none"
        :data-day-index="item.kind === 'day' ? index : undefined"
      >
        <ScheduleCalendarItem
          :item="item"
          :selected="item.kind === 'day' && isSameDay(item.date, model)"
          :dots="item.kind === 'day' ? appointmentDots(item.date) : 0"
          @select="selectDate"
          @open-calendar="openCalendar"
        />
      </div>
    </div>

    <UCarousel
      ref="carousel"
      v-slot="{ item }"
      :items="items"
      align="start"
      wheel-gestures
      class="hidden md:block"
      :ui="{ item: 'basis-[calc(100%/6)] ps-1', container: '-ms-1' }"
      @select="onSelect"
    >
      <ScheduleCalendarItem
        :item="item"
        :selected="item.kind === 'day' && isSameDay(item.date, model)"
        :dots="item.kind === 'day' ? appointmentDots(item.date) : 0"
        @select="selectDate"
        @open-calendar="openCalendar"
      />
    </UCarousel>
  </UCard>
</template>
