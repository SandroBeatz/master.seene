<script setup lang="ts">
import type {
  DatesSetArg,
  EventClickArg,
  EventDropArg,
  EventInput,
  SlotLaneMountArg,
} from '@fullcalendar/core'
import type { DateClickArg } from '@fullcalendar/interaction'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import FullCalendar from '@fullcalendar/vue3'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Appointment } from '@entities/appointment'
import { updateAppointment } from '@entities/appointment'
import { DEFAULT_TIME_FORMAT, DEFAULT_TIME_ZONE, type TimeFormat } from '@entities/master'

const props = withDefaults(
  defineProps<{
    events?: EventInput[]
    timeFormat?: TimeFormat
    timeZone?: string
  }>(),
  {
    events: () => [],
    timeFormat: DEFAULT_TIME_FORMAT,
    timeZone: DEFAULT_TIME_ZONE,
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

function handleSlotLaneMount(arg: SlotLaneMountArg) {
  if (!arg.date) return

  const timeStr = formatCalendarTime(arg.date)
  const span = document.createElement('span')
  span.className = 'fc-slot-time-label'
  span.textContent = timeStr
  arg.el.appendChild(span)
}

function formatCalendarTime(date: Date): string {
  const hour12 = props.timeFormat === 12
  const options: Intl.DateTimeFormatOptions = {
    hour: hour12 ? 'numeric' : '2-digit',
    minute: '2-digit',
    hour12,
  }

  if (props.timeZone !== DEFAULT_TIME_ZONE) {
    options.timeZone = props.timeZone
  }

  try {
    return new Intl.DateTimeFormat(undefined, options).format(date)
  } catch {
    delete options.timeZone
    return new Intl.DateTimeFormat(undefined, options).format(date)
  }
}

const calendarOptions = computed(() => {
  const hour12 = props.timeFormat === 12
  const timeFormat = {
    hour: hour12 ? 'numeric' : '2-digit',
    minute: '2-digit',
    hour12,
  } as const

  return {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    editable: true,
    allDaySlot: false,
    timeZone: props.timeZone,
    slotLabelFormat: timeFormat,
    eventTimeFormat: timeFormat,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay',
    },
    dateClick: handleDateClick,
    eventClick: handleEventClick,
    eventDrop: handleEventDrop,
    datesSet: handleDatesSet,
    slotLaneDidMount: handleSlotLaneMount,
    events: props.events,
  }
})
</script>

<template>
  <div class="w-full">
    <FullCalendar :options="calendarOptions" />
  </div>
</template>
