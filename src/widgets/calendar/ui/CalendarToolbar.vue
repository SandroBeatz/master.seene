<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CalendarViewType } from '../model/calendar-controls'
import CalendarViewTabs from './CalendarViewTabs.vue'

const props = withDefaults(
  defineProps<{
    title: string
    viewType: CalendarViewType
    /** Mobile moves the day/week/month toggle up into the page header. */
    hideViewToggle?: boolean
    /** Hidden when already viewing the current period (mobile behaviour). */
    showToday?: boolean
  }>(),
  {
    showToday: true,
  },
)

const emit = defineEmits<{
  previous: []
  next: []
  today: []
  'update:viewType': [viewType: CalendarViewType]
}>()

const { t } = useI18n()

const calendarTitle = computed(() => props.title || t('calendar.title'))
</script>

<template>
  <div class="flex flex-row items-center justify-between gap-2.5">
    <div class="flex min-w-0 items-center gap-2.5">
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

    <div v-if="showToday || !hideViewToggle" class="flex shrink-0 items-center gap-2.5">
      <UButton
        v-if="showToday"
        color="neutral"
        variant="soft"
        size="sm"
        :aria-label="$t('calendar.controls.today')"
        @click="emit('today')"
      >
        {{ $t('calendar.controls.today') }}
      </UButton>

      <CalendarViewTabs
        v-if="!hideViewToggle"
        :view-type="viewType"
        @update:view-type="emit('update:viewType', $event)"
      />
    </div>
  </div>
</template>
