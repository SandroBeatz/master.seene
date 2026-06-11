<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const model = defineModel<Date>({ required: true })

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

const windowStart = ref(getWeekStart(model.value))

watch(model, (val) => {
  const ws = getWeekStart(val)
  const we = new Date(ws)
  we.setDate(we.getDate() + 6)
  if (val < ws || val > we) {
    windowStart.value = getWeekStart(val)
  }
})

const monthYearLabel = computed(() =>
  new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(model.value),
)

const days = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(windowStart.value)
    d.setDate(windowStart.value.getDate() + i)
    const midnight = new Date(d)
    midnight.setHours(0, 0, 0, 0)
    return {
      date: d,
      label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(d),
      dayNum: String(d.getDate()),
      isToday: midnight.getTime() === today.getTime(),
    }
  })
})

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function prevWeek() {
  const d = new Date(windowStart.value)
  d.setDate(d.getDate() - 7)
  windowStart.value = d
}

function nextWeek() {
  const d = new Date(windowStart.value)
  d.setDate(d.getDate() + 7)
  windowStart.value = d
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
            :aria-label="t('home.upcoming.prevWeek')"
            @click="prevWeek"
          />
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-chevron-right"
            :aria-label="t('home.upcoming.nextWeek')"
            @click="nextWeek"
          />
        </div>
      </div>
    </template>

    <div class="flex gap-1">
      <button
        v-for="day in days"
        :key="day.date.toISOString()"
        type="button"
        class="flex flex-1 flex-col items-center rounded-xl px-1 py-2 text-center transition-colors"
        :class="
          isSameDay(day.date, model)
            ? 'bg-inverted text-inverted'
            : day.isToday
              ? 'ring-1 ring-inset ring-primary/40 text-default hover:bg-elevated'
              : 'text-muted hover:bg-elevated hover:text-default'
        "
        @click="model = day.date"
      >
        <span class="text-xs font-medium uppercase leading-none">{{ day.label }}</span>
        <span class="mt-1 text-sm font-semibold tabular-nums leading-none">{{ day.dayNum }}</span>
      </button>
    </div>
  </UCard>
</template>
