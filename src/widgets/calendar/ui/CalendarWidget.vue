<script setup lang="ts">
import type { EventInput } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import FullCalendar from '@fullcalendar/vue3'

withDefaults(
  defineProps<{
    events?: EventInput[]
  }>(),
  {
    events: () => [],
  },
)

const calendarOptions = {
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
  },
}
</script>

<template>
  <div class="w-full">
    <FullCalendar :options="{ ...calendarOptions, events }" />
  </div>
</template>
