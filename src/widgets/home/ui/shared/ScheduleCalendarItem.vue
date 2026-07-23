<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Typography } from '@shared/ui'

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

type ScheduleCalendarItem = ScheduleCalendarDayItem | ScheduleCalendarMoreItem

const props = withDefaults(
  defineProps<{
    item: ScheduleCalendarItem
    selected?: boolean
    /** Number of appointments for the day (rendered as dots, capped at 5). */
    dots?: number
    /** Whether the day has any time off — shown as a single grey dot. */
    timeOff?: boolean
  }>(),
  {
    selected: false,
    dots: 0,
    timeOff: false,
  },
)

const emit = defineEmits<{
  select: [date: Date]
  openCalendar: []
}>()

const { t } = useI18n()

// Center-weighted dots: the middle dot is the largest/brightest, fading and
// shrinking symmetrically toward the edges (index = distance from center).
const DOT_SIZE = ['size-1.5', 'size-[5px]', 'size-1'] as const
const DOT_OPACITY = ['opacity-100', 'opacity-70', 'opacity-50'] as const

const appointmentDots = computed(() => {
  const count = Math.min(props.dots, 5)
  if (count <= 0) return []
  const center = (count - 1) / 2
  return Array.from({ length: count }, (_, i) => {
    const step = Math.min(Math.round(Math.abs(i - center)), DOT_SIZE.length - 1)
    return { size: DOT_SIZE[step], opacity: DOT_OPACITY[step] }
  })
})

// Nuxt UI button overrides
const buttonUI = {
  base: 'flex h-18 w-full min-w-0 max-w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-md border px-1 py-2 text-center transition-colors md:rounded-lg',
}
</script>

<template>
  <UButton
    v-if="item.kind === 'day'"
    type="button"
    color="neutral"
    variant="ghost"
    :ui="buttonUI"
    :class="
      selected
        ? 'border-transparent bg-inverted text-inverted hover:bg-inverted/90'
        : item.isToday
          ? 'border-default text-default ring-1 ring-inset ring-primary/40 hover:bg-elevated'
          : 'border-default text-default hover:bg-elevated'
    "
    @click="emit('select', item.date)"
  >
    <Typography
      variant="footnote"
      class="max-w-full truncate uppercase font-medium"
      :class="selected ? 'opacity-70' : 'text-muted'"
    >
      {{ item.label }}
    </Typography>

    <Typography variant="h5" class="font-bold">
      {{ item.dayNum }}
    </Typography>
    <span class="flex h-1.5 items-center justify-center gap-0.5">
      <template v-if="appointmentDots.length">
        <span
          v-for="(dot, i) in appointmentDots"
          :key="i"
          class="rounded-full"
          :class="[dot.size, dot.opacity, selected ? 'bg-current' : 'bg-violet-500']"
        />
      </template>
      <span
        v-else-if="timeOff"
        class="size-1 rounded-full"
        :class="selected ? 'bg-current opacity-50' : 'bg-zinc-400'"
      />
    </span>
  </UButton>

  <UButton
    v-else
    type="button"
    color="neutral"
    variant="ghost"
    :ui="buttonUI"
    :aria-label="t('home.upcoming.openCalendar')"
    @click="emit('openCalendar')"
  >
    <UIcon name="i-lucide-calendar-days" class="size-5" />
    <span class="text-[0.625rem] font-medium leading-none">{{ t('home.upcoming.more') }}</span>
  </UButton>
</template>
