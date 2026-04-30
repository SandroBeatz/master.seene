<script setup lang="ts">
import type { DatesSetArg, EventClickArg, EventDropArg, EventInput } from '@fullcalendar/core'
import type { DateClickArg } from '@fullcalendar/interaction'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import FullCalendar from '@fullcalendar/vue3'
import { useI18n } from 'vue-i18n'
import type { Appointment } from '@entities/appointment'
import { updateAppointment } from '@entities/appointment'

withDefaults(
  defineProps<{
    events?: EventInput[]
  }>(),
  {
    events: () => [],
  },
)

const emit = defineEmits<{
  'slot-click': [dateStr: string]
  'event-click': [appointment: Appointment]
  'dates-set': [range: { from: string; to: string }]
}>()

const { t } = useI18n()
const toast = useToast()

function handleDateClick(info: DateClickArg) {
  emit('slot-click', info.dateStr)
}

function handleEventClick(info: EventClickArg) {
  const appointment = info.event.extendedProps.appointment as Appointment
  emit('event-click', appointment)
}

async function handleEventDrop(info: EventDropArg) {
  try {
    await updateAppointment({ id: info.event.id, start_at: info.event.startStr })
  } catch {
    info.revert()
    toast.add({ title: t('appointments.dragError'), color: 'error' })
  }
}

function handleDatesSet(info: DatesSetArg) {
  emit('dates-set', { from: info.startStr, to: info.endStr })
}

const calendarOptions = {
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  editable: true,
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
  },
  dateClick: handleDateClick,
  eventClick: handleEventClick,
  eventDrop: handleEventDrop,
  datesSet: handleDatesSet,
}
</script>

<template>
  <div class="w-full">
    <FullCalendar :options="{ ...calendarOptions, events }" />
  </div>
</template>
