<script setup lang="ts">
import type {
  CalendarApi,
  CalendarOptions,
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
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Appointment } from '@entities/appointment'
import { updateAppointment } from '@entities/appointment'
import { DEFAULT_TIME_FORMAT, DEFAULT_TIME_ZONE, type TimeFormat } from '@entities/master'
import {
  normalizeCalendarViewType,
  type CalendarDateRange,
  type CalendarViewType,
  type CalendarWidgetExpose,
} from '../model/calendar-controls'

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
  'dates-set': [range: CalendarDateRange]
}>()

const { t } = useI18n()
const toast = useToast()
const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null)

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
  emit('dates-set', {
    from: info.startStr,
    to: info.endStr,
    currentFrom: info.view.currentStart.toISOString(),
    currentTo: info.view.currentEnd.toISOString(),
    title: info.view.title,
    viewType: normalizeCalendarViewType(info.view.type),
  })
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

const calendarOptions = computed<CalendarOptions>(() => {
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
    headerToolbar: false,
    dateClick: handleDateClick,
    eventClick: handleEventClick,
    eventDrop: handleEventDrop,
    datesSet: handleDatesSet,
    slotLaneDidMount: handleSlotLaneMount,
    events: props.events,
  }
})

function getCalendarApi(): CalendarApi | undefined {
  return calendarRef.value?.getApi()
}

function moveToPrevious() {
  getCalendarApi()?.prev()
}

function moveToNext() {
  getCalendarApi()?.next()
}

function moveToToday() {
  getCalendarApi()?.today()
}

function changeView(viewType: CalendarViewType) {
  getCalendarApi()?.changeView(viewType)
}

defineExpose<CalendarWidgetExpose>({
  moveToPrevious,
  moveToNext,
  moveToToday,
  changeView,
})
</script>

<template>
  <div class="w-full">
    <FullCalendar ref="calendarRef" :options="calendarOptions" />
  </div>
</template>
