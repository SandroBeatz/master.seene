<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
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
const viewOptions = computed<{ value: CalendarViewType; label: string; icon: string }[]>(() => [
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
</script>

<template>
  <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div class="flex min-w-0 flex-wrap items-center gap-3">
      <UFieldGroup>
        <UTooltip :text="$t('calendar.controls.previous')">
          <UButton
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="outline"
            :aria-label="$t('calendar.controls.previous')"
            @click="emit('previous')"
          />
        </UTooltip>

        <UButton
          color="neutral"
          variant="outline"
          :aria-label="$t('calendar.controls.today')"
          @click="emit('today')"
        >
          {{ $t('calendar.controls.today') }}
        </UButton>

        <UTooltip :text="$t('calendar.controls.next')">
          <UButton
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="outline"
            :aria-label="$t('calendar.controls.next')"
            @click="emit('next')"
          />
        </UTooltip>
      </UFieldGroup>

      <h2 class="min-w-0 truncate text-base font-semibold text-highlighted sm:text-lg">
        {{ calendarTitle }}
      </h2>
    </div>

    <UFieldGroup class="shrink-0">
      <UButton
        v-for="view in viewOptions"
        :key="view.value"
        :leading-icon="view.icon"
        color="neutral"
        size="sm"
        :variant="viewType === view.value ? 'solid' : 'outline'"
        :aria-label="view.label"
        @click="emit('update:viewType', view.value)"
      >
        {{ view.label }}
      </UButton>
    </UFieldGroup>
  </div>
</template>
