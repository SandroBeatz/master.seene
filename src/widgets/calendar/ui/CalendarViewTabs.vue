<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TabsItem } from '@nuxt/ui'
import type { CalendarViewType } from '../model/calendar-controls'

defineOptions({ name: 'CalendarViewTabs' })

const props = defineProps<{
  viewType: CalendarViewType
  /** Tighter, icon-less pills for the narrow mobile page header. */
  compact?: boolean
}>()

const emit = defineEmits<{
  'update:viewType': [viewType: CalendarViewType]
}>()

const { t } = useI18n()

const viewOptions = computed<TabsItem[]>(() => [
  {
    value: 'dayGridMonth',
    label: t('calendar.views.month'),
    icon: props.compact ? undefined : 'i-lucide-calendar-days',
  },
  {
    value: 'timeGridWeek',
    label: t('calendar.views.week'),
    icon: props.compact ? undefined : 'i-lucide-columns-3',
  },
  {
    value: 'timeGridDay',
    label: t('calendar.views.day'),
    icon: props.compact ? undefined : 'i-lucide-calendar-1',
  },
])

// Pill styling mirrors the home widgets (HomeOverviewWidget) for a unified look.
const tabsUI = computed(() => ({
  root: 'w-full sm:w-auto',
  list: 'rounded-full bg-zinc-100 p-1 dark:bg-zinc-800',
  indicator: 'rounded-full bg-default shadow-sm',
  trigger: `cursor-pointer rounded-full data-[state=active]:text-highlighted data-[state=inactive]:text-muted ${
    props.compact ? 'px-3 py-1.5' : 'px-5 py-2'
  }`,
}))
</script>

<template>
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
</template>
