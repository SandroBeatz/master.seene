<script setup lang="ts">
import { computed } from 'vue'

const model = defineModel<Date>({ required: true })

const days = computed(() => {
  const result: { date: Date; label: string; dayNum: string; isToday: boolean }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    result.push({
      date: d,
      label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(d),
      dayNum: String(d.getDate()),
      isToday: i === 0,
    })
  }
  return result
})

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
</script>

<template>
  <div class="flex gap-1">
    <button
      v-for="day in days"
      :key="day.dayNum"
      type="button"
      class="flex flex-1 flex-col items-center rounded-xl px-2 py-2 text-center transition-colors"
      :class="
        isSameDay(day.date, model)
          ? 'bg-primary text-white'
          : 'hover:bg-elevated text-muted hover:text-default'
      "
      @click="model = day.date"
    >
      <span class="text-xs font-medium uppercase">{{ day.label }}</span>
      <span class="mt-0.5 text-sm font-semibold">{{ day.dayNum }}</span>
    </button>
  </div>
</template>
