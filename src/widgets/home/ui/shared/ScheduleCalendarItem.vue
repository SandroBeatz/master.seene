<script setup lang="ts">
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

withDefaults(
  defineProps<{
    item: ScheduleCalendarItem
    selected?: boolean
    dots?: number
  }>(),
  {
    selected: false,
    dots: 0,
  },
)

const emit = defineEmits<{
  select: [date: Date]
  openCalendar: []
}>()

const { t } = useI18n()

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
      class="max-w-full truncate font-medium"
      :class="selected ? 'opacity-70' : 'text-muted'"
    >
      {{ item.label }}
    </Typography>

    <Typography variant="h5" class="font-bold">
      {{ item.dayNum }}
    </Typography>
    <span class="flex items-center justify-center gap-0.5">
      <span
        v-for="dot in dots"
        :key="dot"
        class="size-1 rounded-full"
        :class="selected ? 'bg-current' : 'bg-violet-500'"
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
