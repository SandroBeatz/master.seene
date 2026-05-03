<script setup lang="ts">
import type {
  CalendarApi,
  CalendarOptions,
  DatesSetArg,
  EventClickArg,
  EventDropArg,
  EventInput,
  SlotLaneContentArg,
  SlotLaneMountArg,
} from '@fullcalendar/core'
import frLocale from '@fullcalendar/core/locales/fr'
import ruLocale from '@fullcalendar/core/locales/ru'
import type { DateClickArg } from '@fullcalendar/interaction'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import FullCalendar from '@fullcalendar/vue3'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Appointment } from '@entities/appointment'
import { updateAppointment } from '@entities/appointment'
import {
  DEFAULT_TIME_FORMAT,
  DEFAULT_TIME_ZONE,
  type MasterSchedule,
  type TimeFormat,
} from '@entities/master'
import type { TimeBlock } from '@entities/time-block'
import { updateTimeBlock } from '@entities/time-block'
import { toUtcIsoFromCalendarDateString } from '@shared/lib/time-zone'
import {
  normalizeCalendarViewType,
  type CalendarDateRange,
  type CalendarViewType,
  type CalendarWidgetExpose,
} from '../model/calendar-controls'
import {
  buildCalendarScheduleDisplay,
  isCalendarScheduleBreakSlot,
} from '../model/calendar-schedule'
import { normalizeCalendarLocale } from '../model/calendar-locale'

const props = withDefaults(
  defineProps<{
    events?: EventInput[]
    schedule?: MasterSchedule | null
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
  'time-block-click': [timeBlock: TimeBlock]
  'dates-set': [range: CalendarDateRange]
}>()

const { t, locale } = useI18n()
const toast = useToast()
const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null)
const currentViewType = ref<CalendarViewType>('timeGridWeek')
const currentFullCalendarLocale = computed(() => normalizeCalendarLocale(locale.value))
const scheduleDisplay = computed(() => buildCalendarScheduleDisplay(props.schedule))
const timeGridScheduleDisplay = computed(() =>
  currentViewType.value === 'timeGridWeek' || currentViewType.value === 'timeGridDay'
    ? scheduleDisplay.value
    : { backgroundEvents: [] },
)
const calendarEventsWithSchedule = computed(() => [
  ...props.events,
  ...timeGridScheduleDisplay.value.backgroundEvents,
])
const calendarRenderKey = computed(() => {
  const display = scheduleDisplay.value

  return JSON.stringify({
    timeZone: props.timeZone,
    timeFormat: props.timeFormat,
    locale: currentFullCalendarLocale.value,
    allDayText: t('calendar.allDay'),
    slotMinTime: display.slotMinTime ?? null,
    slotMaxTime: display.slotMaxTime ?? null,
    businessHours: display.businessHours ?? null,
    backgroundEvents: display.backgroundEvents.map((event) => ({
      daysOfWeek: event.daysOfWeek,
      startTime: event.startTime,
      endTime: event.endTime,
    })),
  })
})

function handleDateClick(info: DateClickArg) {
  emit('slot-click', toUtcIsoFromCalendarDateString(info.dateStr, props.timeZone))
}

function handleEventClick(info: EventClickArg) {
  if (info.event.extendedProps.type === 'time-block') {
    emit('time-block-click', info.event.extendedProps.timeBlock as TimeBlock)
    return
  }

  const appointment = info.event.extendedProps.appointment as Appointment
  emit('event-click', appointment)
}

async function handleEventDrop(info: EventDropArg) {
  try {
    if (info.event.extendedProps.type === 'time-block') {
      const startAt = info.event.startStr
        ? toUtcIsoFromCalendarDateString(info.event.startStr, props.timeZone)
        : undefined
      const endAt = info.event.endStr
        ? toUtcIsoFromCalendarDateString(info.event.endStr, props.timeZone)
        : undefined
      if (!startAt || !endAt) throw new Error('Invalid time block range')

      await updateTimeBlock({ id: info.event.id, start_at: startAt, end_at: endAt })
      return
    }

    await updateAppointment({
      id: info.event.id,
      start_at: toUtcIsoFromCalendarDateString(info.event.startStr, props.timeZone),
    })
  } catch {
    info.revert()
    toast.add({ title: t('calendar.dragError'), color: 'error' })
  }
}

function handleDatesSet(info: DatesSetArg) {
  currentViewType.value = normalizeCalendarViewType(info.view.type)

  emit('dates-set', {
    from: toUtcIsoFromCalendarDateString(info.startStr, props.timeZone),
    to: toUtcIsoFromCalendarDateString(info.endStr, props.timeZone),
    currentFrom: toUtcIsoFromCalendarDateString(
      getCalendarDateString(info.view.currentStart),
      props.timeZone,
    ),
    currentTo: toUtcIsoFromCalendarDateString(
      getCalendarDateString(info.view.currentEnd),
      props.timeZone,
    ),
    title: info.view.title,
    viewType: currentViewType.value,
  })
}

function getCalendarDateString(date: Date): string {
  const useUtcParts = props.timeZone !== DEFAULT_TIME_ZONE
  const year = useUtcParts ? date.getUTCFullYear() : date.getFullYear()
  const month = useUtcParts ? date.getUTCMonth() + 1 : date.getMonth() + 1
  const day = useUtcParts ? date.getUTCDate() : date.getDate()
  const hour = useUtcParts ? date.getUTCHours() : date.getHours()
  const minute = useUtcParts ? date.getUTCMinutes() : date.getMinutes()
  const second = useUtcParts ? date.getUTCSeconds() : date.getSeconds()

  return `${year}-${padDatePart(month)}-${padDatePart(day)}T${padDatePart(hour)}:${padDatePart(
    minute,
  )}:${padDatePart(second)}`
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0')
}

function handleSlotLaneMount(arg: SlotLaneMountArg) {
  if (!arg.date) return

  const timeStr = formatCalendarTime(arg.date)
  const span = document.createElement('span')
  span.className = 'fc-slot-time-label'
  span.textContent = timeStr
  arg.el.appendChild(span)
}

function getSlotLaneClassNames(arg: SlotLaneContentArg): string[] {
  if (!arg.date) return []

  const { dayOfWeek, minutes } = getCalendarSlotTimeParts(arg.date)

  return isCalendarScheduleBreakSlot(props.schedule, dayOfWeek, minutes)
    ? ['fc-schedule-break-slot']
    : []
}

function getCalendarSlotTimeParts(date: Date) {
  const useUtcParts = props.timeZone !== DEFAULT_TIME_ZONE
  const dayOfWeek = useUtcParts ? date.getUTCDay() : date.getDay()
  const hour = useUtcParts ? date.getUTCHours() : date.getHours()
  const minute = useUtcParts ? date.getUTCMinutes() : date.getMinutes()

  return {
    dayOfWeek,
    minutes: hour * 60 + minute,
  }
}

function formatCalendarTime(date: Date): string {
  const hour12 = props.timeFormat === 12
  const options: Intl.DateTimeFormatOptions = {
    hour: hour12 ? 'numeric' : '2-digit',
    minute: '2-digit',
    hour12,
  }

  if (props.timeZone !== DEFAULT_TIME_ZONE) {
    options.timeZone = 'UTC'
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
  const calendarScheduleDisplay = timeGridScheduleDisplay.value
  const scheduleOptions: Pick<CalendarOptions, 'slotMinTime' | 'slotMaxTime' | 'businessHours'> = {}

  if (calendarScheduleDisplay.slotMinTime) {
    scheduleOptions.slotMinTime = calendarScheduleDisplay.slotMinTime
  }

  if (calendarScheduleDisplay.slotMaxTime) {
    scheduleOptions.slotMaxTime = calendarScheduleDisplay.slotMaxTime
  }

  if (calendarScheduleDisplay.businessHours) {
    scheduleOptions.businessHours = calendarScheduleDisplay.businessHours
  }

  return {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    locales: [frLocale, ruLocale],
    locale: currentFullCalendarLocale.value,
    initialView: 'timeGridWeek',
    editable: true,
    allDaySlot: true,
    allDayText: t('calendar.allDay'),
    timeZone: props.timeZone,
    slotLabelFormat: timeFormat,
    eventTimeFormat: timeFormat,
    headerToolbar: false,
    dateClick: handleDateClick,
    eventClick: handleEventClick,
    eventDrop: handleEventDrop,
    datesSet: handleDatesSet,
    slotLaneClassNames: getSlotLaneClassNames,
    slotLaneDidMount: handleSlotLaneMount,
    ...scheduleOptions,
    events: calendarEventsWithSchedule.value,
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
  currentViewType.value = viewType
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
    <FullCalendar :key="calendarRenderKey" ref="calendarRef" :options="calendarOptions" />
  </div>
</template>
