<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useLocaleStore } from '@shared/lib/locale'

const { t } = useI18n()
const router = useRouter()
const localeStore = useLocaleStore()
const model = defineModel<Date>({ required: true })

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
      :ui="{ item: 'basis-[calc(100%/7)] ps-1', container: 'ms-0' }"
      @select="onSelect"
    >
      <button
        v-if="item.kind === 'day'"
        type="button"
        class="flex w-full flex-col items-center rounded-xl px-1 py-2 text-center transition-colors"
        :class="
          isSameDay(item.date, model)
            ? 'bg-inverted text-inverted'
            : item.isToday
              ? 'ring-1 ring-inset ring-primary/40 text-default hover:bg-elevated'
              : 'text-muted hover:bg-elevated hover:text-default'
        "
        @click="model = item.date"
      >
        <span class="text-xs font-medium uppercase leading-none">{{ item.label }}</span>
        <span class="mt-1 text-sm font-semibold tabular-nums leading-none">{{ item.dayNum }}</span>
        <!-- Appointment-count dots are added in a separate task (master.seene-x4f). -->
      </button>

      <button
        v-else
        type="button"
        class="flex w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-muted transition-colors hover:bg-elevated hover:text-default"
        :aria-label="t('home.upcoming.openCalendar')"
        @click="openCalendar"
      >
        <UIcon name="i-lucide-calendar-days" class="size-5" />
        <span class="text-[0.625rem] font-medium uppercase leading-none">
          {{ t('home.upcoming.more') }}
        </span>
      </button>
    </UCarousel>
  </UCard>
</template>
