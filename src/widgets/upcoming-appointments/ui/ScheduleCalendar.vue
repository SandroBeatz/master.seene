<script setup lang="ts">
import { computed, ref, toRef, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useLocaleStore } from '@shared/lib/locale'
import { useAppointmentDayCountsQuery, type AppointmentDayCountsRange } from '@entities/appointment'

const { t } = useI18n()
const router = useRouter()
const localeStore = useLocaleStore()
const model = defineModel<Date>({ required: true })
const props = defineProps<{ userId: string; timeZone: string }>()

interface DayItem {
  kind: 'day'
  date: Date
  label: string
  dayNum: string
  isToday: boolean
}

// Trailing slide that links to the full calendar page once the month window ends.
interface MoreItem {
  kind: 'more'
}

type CarouselItem = DayItem | MoreItem

// One month window, fully materialised so the user can swipe to the last day in one go.
const DAYS_TOTAL = 30

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const today = startOfToday()

const days = computed<DayItem[]>(() => {
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

const items = computed<CarouselItem[]>(() => [...days.value, { kind: 'more' }])

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
  return new Intl.DateTimeFormat(localeStore.current, { month: 'long', year: 'numeric' }).format(date)
})

const carousel = useTemplateRef('carousel')

// Index of the currently selected day within the window (-1 if outside it).
const selectedIndex = computed(() => days.value.findIndex((d) => isSameDay(d.date, model.value)))

function onSelect() {
  const api = carousel.value?.emblaApi
  if (!api) return
  // Track the first slide actually in view so the month header follows the swipe.
  const first = api.slidesInView()[0]
  if (first !== undefined) leadingIndex.value = first
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

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold capitalize">{{ monthYearLabel }}</span>
        <div class="flex items-center gap-1">
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-chevron-left"
            :disabled="selectedIndex <= 0"
            :aria-label="t('home.upcoming.prevDay')"
            @click="goPrev"
          />
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-chevron-right"
            :disabled="selectedIndex === days.length - 1"
            :aria-label="t('home.upcoming.nextDay')"
            @click="goNext"
          />
        </div>
      </div>
    </template>

    <UCarousel
      ref="carousel"
      v-slot="{ item }"
      :items="items"
      align="start"
      wheel-gestures
      :ui="{ item: 'basis-[calc(100%/7)] ps-1.5', container: 'ms-0' }"
      @select="onSelect"
    >
      <button
        v-if="item.kind === 'day'"
        type="button"
        class="flex w-full flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-center transition-colors"
        :class="
          isSameDay(item.date, model)
            ? 'border-transparent bg-inverted text-inverted'
            : item.isToday
              ? 'border-default text-default ring-1 ring-inset ring-primary/40 hover:bg-elevated'
              : 'border-default text-default hover:bg-elevated'
        "
        @click="model = item.date"
      >
        <span
          class="text-xs font-medium leading-none"
          :class="isSameDay(item.date, model) ? 'opacity-70' : 'text-muted'"
        >
          {{ item.label }}
        </span>
        <span class="text-base font-bold tabular-nums leading-none">{{ item.dayNum }}</span>
        <span class="flex h-1.5 items-center justify-center gap-0.5">
          <span
            v-for="dot in appointmentDots(item.date)"
            :key="dot"
            class="size-1 rounded-full"
            :class="isSameDay(item.date, model) ? 'bg-current' : 'bg-violet-500'"
          />
        </span>
      </button>

      <button
        v-else
        type="button"
        class="flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-default px-1 py-3 text-center text-muted transition-colors hover:bg-elevated hover:text-default"
        :aria-label="t('home.upcoming.openCalendar')"
        @click="openCalendar"
      >
        <UIcon name="i-lucide-calendar-days" class="size-5" />
        <span class="text-[0.625rem] font-medium leading-none">{{ t('home.upcoming.more') }}</span>
      </button>
    </UCarousel>
  </UCard>
</template>
