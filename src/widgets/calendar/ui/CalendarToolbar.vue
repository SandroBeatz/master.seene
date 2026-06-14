<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TabsItem } from '@nuxt/ui'
import type { CalendarViewType } from '../model/calendar-controls'

const props = defineProps<{
  title: string
  viewType: CalendarViewType
}>()

const emit = defineEmits<{
  previous: []
  next: []
  today: []
  'update:viewType': [viewType: CalendarViewType]
}>()

const { t } = useI18n()

const calendarTitle = computed(() => props.title || t('calendar.title'))
const viewOptions = computed<TabsItem[]>(() => [
  {
    value: 'dayGridMonth',
    label: t('calendar.views.month'),
    icon: 'i-lucide-calendar-days',
  },
  {
    value: 'timeGridWeek',
    label: t('calendar.views.week'),
    icon: 'i-lucide-columns-3',
  },
  {
    value: 'timeGridDay',
    label: t('calendar.views.day'),
    icon: 'i-lucide-calendar-1',
  },
])

// Pill styling mirrors the home widgets (HomeOverviewWidget) for a unified look.
const tabsUI = {
  root: 'w-full sm:w-auto',
  list: 'rounded-full bg-zinc-100 p-1 dark:bg-zinc-800',
  indicator: 'rounded-full bg-default shadow-sm',
  trigger:
    'cursor-pointer rounded-full px-5 py-2 data-[state=active]:text-highlighted data-[state=inactive]:text-muted',
}
</script>

<template>
  <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div class="flex min-w-0 flex-wrap items-center gap-2.5">
      <UTooltip :text="$t('calendar.controls.previous')">
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="outline"
          :aria-label="$t('calendar.controls.previous')"
          @click="emit('previous')"
        />
      </UTooltip>

      <UTooltip :text="$t('calendar.controls.next')">
        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="outline"
          :aria-label="$t('calendar.controls.next')"
          @click="emit('next')"
        />
      </UTooltip>

      <h2 class="min-w-0 truncate text-base font-semibold text-highlighted sm:text-lg">
        {{ calendarTitle }}
      </h2>
    </div>

    <div class="flex shrink-0 items-center gap-2.5">
      <UButton
        color="neutral"
        variant="soft"
        :aria-label="$t('calendar.controls.today')"
        @click="emit('today')"
      >
        {{ $t('calendar.controls.today') }}
      </UButton>

      <UTabs
        :model-value="viewType"
        :items="viewOptions"
        variant="pill"
        color="neutral"
        size="sm"
        :content="false"
        :ui="tabsUI"
        @update:model-value="emit('update:viewType', $event as CalendarViewType)"
      />
    </div>
  </div>
</template>
