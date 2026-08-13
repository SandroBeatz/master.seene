<script setup lang="ts">
import type {
  CalendarApi,
  CalendarOptions,
  DateSelectArg,
  DatesSetArg,
  DayHeaderContentArg,
  EventApi,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
  SlotLaneContentArg,
  SlotLaneMountArg,
} from '@fullcalendar/core'
import frLocale from '@fullcalendar/core/locales/fr'
import ruLocale from '@fullcalendar/core/locales/ru'
import type {
  DateClickArg,
  EventDragStartArg,
  EventDragStopArg,
  EventResizeDoneArg,
  EventResizeStartArg,
  EventResizeStopArg,
} from '@fullcalendar/interaction'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import scrollGridPlugin from '@fullcalendar/scrollgrid'
import FullCalendar from '@fullcalendar/vue3'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Appointment } from '@entities/appointment'
import { useUpdateAppointmentMutation } from '@entities/appointment'
import {
  DEFAULT_TIME_FORMAT,
  DEFAULT_TIME_ZONE,
  DEFAULT_CALENDAR_FIRST_DAY,
  DEFAULT_CALENDAR_SLOT_STEP_MINUTES,
  DEFAULT_CALENDAR_VIEW,
  type CalendarFirstDay,
  type MasterSchedule,
  type MasterCalendarViewType,
  type TimeFormat,
} from '@entities/master'
import type { TimeBlock } from '@entities/time-block'
import { useUpdateTimeBlockMutation } from '@entities/time-block'
import { useIsMobile } from '@shared/lib/viewport'
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
import CalendarAppointmentEventContent from './CalendarAppointmentEventContent.vue'

const props = withDefaults(
  defineProps<{
    userId: string
    events?: EventInput[]
    schedule?: MasterSchedule | null
    timeFormat?: TimeFormat
    timeZone?: string
    firstDay?: CalendarFirstDay
    slotStepMinutes?: number
    defaultView?: MasterCalendarViewType
  }>(),
  {
    events: () => [],
    timeFormat: DEFAULT_TIME_FORMAT,
    timeZone: DEFAULT_TIME_ZONE,
    firstDay: DEFAULT_CALENDAR_FIRST_DAY,
    slotStepMinutes: DEFAULT_CALENDAR_SLOT_STEP_MINUTES,
    defaultView: DEFAULT_CALENDAR_VIEW,
  },
)

const emit = defineEmits<{
  'slot-click': [dateStr: string]
  'event-click': [appointment: Appointment]
  'time-block-click': [timeBlock: TimeBlock]
  'dates-set': [range: CalendarDateRange]
}>()

type CalendarEventChange = 'move' | 'resize'

interface FullCalendarEventSelectionApi extends CalendarApi {
  dispatch: (action: { type: 'UNSELECT_EVENT' }) => void
}

const { t, locale } = useI18n()
const toast = useToast()
const isMobile = useIsMobile()
const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null)
const calendarContainerRef = ref<HTMLElement | null>(null)
const currentViewType = ref<CalendarViewType>(props.defaultView)
const editingEventId = ref<string | null>(null)
const MOBILE_LONG_PRESS_DELAY_MS = 450
const MOBILE_HAPTIC_DURATION_MS = 35
const EVENT_CLICK_SUPPRESS_AFTER_DRAG_MS = 350
let suppressEventClickUntil = 0
// `datesSet` also fires for non-navigation updates. Only align the mobile week
// after initialization or an explicit calendar navigation.
let shouldAlignMobileWeekAfterDatesSet = true
const mutationUserId = computed(() => props.userId)
const updateAppointmentMutation = useUpdateAppointmentMutation(mutationUserId)
const updateTimeBlockMutation = useUpdateTimeBlockMutation(mutationUserId)
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
const displayedCalendarEvents = computed(() => {
  if (!isMobile.value || !isTimeGridViewType(currentViewType.value)) {
    return calendarEventsWithSchedule.value
  }

  return calendarEventsWithSchedule.value.map((event) =>
    event.allDay
      ? {
          ...event,
          allDay: false,
          extendedProps: {
            ...event.extendedProps,
            calendarOriginalAllDay: true,
          },
        }
      : event,
  )
})

// Vertical scroll position (and, when needed, the grid's top boundary): the
// schedule's slotMinTime by default (top of the grid — no scroll offset), or an
// earlier real event's start time if one falls before that, so it's never left
// scrolled out of view above the fold. Time-off/break background events don't
// count — only real appointments/time-blocks in `props.events`.
const gridTopMinutes = computed(() => {
  const scheduleMinTime = timeGridScheduleDisplay.value.slotMinTime
  const scheduleMinMinutes = scheduleMinTime ? (parseSlotTimeToMinutes(scheduleMinTime) ?? 0) : 0
  const earliestEventMinutes = getEarliestEventStartMinutes(props.events)

  if (earliestEventMinutes !== null && earliestEventMinutes < scheduleMinMinutes) {
    return Math.max(0, earliestEventMinutes)
  }

  return scheduleMinMinutes
})
const verticalScrollTime = computed(() => minutesToSlotTime(gridTopMinutes.value))
const calendarRenderKey = computed(() => {
  const display = scheduleDisplay.value

  return JSON.stringify({
    timeZone: props.timeZone,
    timeFormat: props.timeFormat,
    firstDay: props.firstDay,
    slotStepMinutes: props.slotStepMinutes,
    defaultView: props.defaultView,
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
  if (info.view.type === 'dayGridMonth') {
    currentViewType.value = 'timeGridDay'
    info.view.calendar.changeView('timeGridDay', info.dateStr)
    return
  }

  if (isMobile.value && isTimeGridViewType(info.view.type)) return

  emit('slot-click', toUtcIsoFromCalendarDateString(info.dateStr, props.timeZone))
}

function handleDateSelect(info: DateSelectArg) {
  if (!isMobile.value || !isTimeGridViewType(info.view.type)) return

  info.view.calendar.unselect()
  navigator.vibrate?.(MOBILE_HAPTIC_DURATION_MS)
  emit('slot-click', toUtcIsoFromCalendarDateString(info.startStr, props.timeZone))
}

function isTimeGridViewType(viewType: string): boolean {
  return viewType === 'timeGridWeek' || viewType === 'timeGridDay'
}

function handleEventClick(info: EventClickArg) {
  if (info.view.type === 'dayGridMonth') return
  if (isMobile.value && Date.now() < suppressEventClickUntil) return

  clearEventEditing()

  if (info.event.extendedProps.type === 'time-block') {
    emit('time-block-click', info.event.extendedProps.timeBlock as TimeBlock)
    return
  }

  const appointment = info.event.extendedProps.appointment as Appointment
  emit('event-click', appointment)
}

function beginMobileEventEditing(info: EventDragStartArg | EventResizeStartArg) {
  if (!isMobile.value || !isTimeGridViewType(info.view.type)) return

  if (editingEventId.value !== info.event.id) {
    navigator.vibrate?.(MOBILE_HAPTIC_DURATION_MS)
  }

  editingEventId.value = info.event.id
}

function finishMobileEventGesture(info: EventDragStopArg | EventResizeStopArg) {
  if (!isMobile.value || !isTimeGridViewType(info.view.type)) return

  suppressEventClickUntil = Date.now() + EVENT_CLICK_SUPPRESS_AFTER_DRAG_MS
}

function getCalendarEventRange(event: EventApi) {
  const startAt = event.startStr
    ? toUtcIsoFromCalendarDateString(event.startStr, props.timeZone)
    : undefined
  const endAt = event.endStr
    ? toUtcIsoFromCalendarDateString(event.endStr, props.timeZone)
    : undefined

  if (!startAt) throw new Error('Calendar event has no start date')

  return { startAt, endAt }
}

function getCalendarEventDurationMinutes(event: EventApi): number {
  if (!event.start || !event.end) throw new Error('Calendar event has no duration')

  const duration = Math.round((event.end.getTime() - event.start.getTime()) / 60_000)
  if (duration <= 0) throw new Error('Calendar event has invalid duration')

  return duration
}

async function persistCalendarEventTiming(event: EventApi, change: CalendarEventChange) {
  const { startAt, endAt } = getCalendarEventRange(event)

  if (event.extendedProps.type === 'time-block') {
    if (!endAt) throw new Error('Time block has no end date')

    await updateTimeBlockMutation.mutateAsync({
      id: event.id,
      start_at: startAt,
      end_at: endAt,
      all_day: event.extendedProps.calendarOriginalAllDay === true || event.allDay,
    })
    return
  }

  await updateAppointmentMutation.mutateAsync({
    id: event.id,
    start_at: startAt,
    ...(change === 'resize' ? { duration: getCalendarEventDurationMinutes(event) } : {}),
  })
}

async function handleCalendarEventChange(
  info: EventDropArg | EventResizeDoneArg,
  change: CalendarEventChange,
) {
  try {
    await persistCalendarEventTiming(info.event, change)
    toast.add({
      title: t(change === 'move' ? 'calendar.moveSuccess' : 'calendar.resizeSuccess'),
      color: 'success',
    })
  } catch {
    info.revert()
    toast.add({ title: t('calendar.updateError'), color: 'error' })
  } finally {
    clearEventEditing()
  }
}

function handleEventDrop(info: EventDropArg) {
  return handleCalendarEventChange(info, 'move')
}

function handleEventResize(info: EventResizeDoneArg) {
  return handleCalendarEventChange(info, 'resize')
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!editingEventId.value) return

  const target = event.target
  if (target instanceof Element && target.closest('.fc-event')) return

  clearEventEditing()
}

function clearEventEditing() {
  editingEventId.value = null

  // `CalendarApi.unselect()` only clears a date selection. FullCalendar has
  // no public equivalent for its touch-selected event, so dispatch the same
  // action its interaction plugin uses when the user taps outside an event.
  const calendarApi = getCalendarApi() as FullCalendarEventSelectionApi | undefined
  calendarApi?.dispatch({ type: 'UNSELECT_EVENT' })
}

onMounted(() => document.addEventListener('pointerdown', handleDocumentPointerDown, true))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleDocumentPointerDown, true))

// FullCalendar only applies `fc-day-today` when today belongs to the displayed
// week. Current week → align today to the left; any other week → align Monday
// (or the configured first day) to the left.
function alignMobileWeek() {
  if (!isMobile.value || currentViewType.value !== 'timeGridWeek') return

  const calendarContainer = calendarContainerRef.value
  if (!calendarContainer) return

  const firstColumn = calendarContainer.querySelector<HTMLElement>(
    '.fc-timegrid-cols .fc-timegrid-col:not(.fc-timegrid-axis)',
  )
  const todayColumn = calendarContainer.querySelector<HTMLElement>('.fc-timegrid-col.fc-day-today')
  const targetColumn = todayColumn ?? firstColumn

  targetColumn?.scrollIntoView({ behavior: 'auto', inline: 'start', block: 'nearest' })
}

function handleDatesSet(info: DatesSetArg) {
  currentViewType.value = normalizeCalendarViewType(info.view.type)
  clearEventEditing()

  if (shouldAlignMobileWeekAfterDatesSet) {
    shouldAlignMobileWeekAfterDatesSet = false
    alignMobileWeek()
  }

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

  // Keep the cell DOM-empty so FullCalendar's `.fc-timegrid-slot:empty::before`
  // continues to establish the same row height as the detached mobile time axis.
  arg.el.dataset.slotTimeLabel = formatCalendarTime(arg.date)
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

function renderDayHeaderContent(arg: DayHeaderContentArg) {
  if (arg.view.type !== 'timeGridWeek') return arg.text

  const weekday = formatCalendarWeekday(arg.date)
  const dayNumber = getCalendarDateParts(arg.date).day
  const root = document.createElement('div')
  const weekdayElement = document.createElement('span')
  const dayElement = document.createElement('span')

  root.className = 'fc-week-day-header-content'
  weekdayElement.className = 'fc-week-day-header-weekday'
  weekdayElement.textContent = weekday
  dayElement.className = 'fc-week-day-header-number'
  dayElement.textContent = String(dayNumber)
  root.append(weekdayElement, dayElement)

  return { domNodes: [root] }
}

function getEventClassNames(arg: EventContentArg): string[] {
  const isAppointment = arg.event.extendedProps.type === 'appointment'
  const isTimeBlock = arg.event.extendedProps.type === 'time-block'
  const classNames: string[] = []

  if (arg.view.type === 'dayGridMonth') {
    classNames.push('calendar-month-event')
  } else if (isAppointment) {
    classNames.push('app-appointment-event')

    if (isMobile.value) {
      classNames.push('calendar-mobile-appointment-event')
      if (arg.event.extendedProps.isGroup) {
        classNames.push('calendar-mobile-group-appointment-event')
      }
    }
  } else if (isMobile.value && isTimeBlock) {
    classNames.push('calendar-mobile-time-off-event')
  }

  if (editingEventId.value === arg.event.id) {
    classNames.push('calendar-event-editing-target')
  }

  return classNames
}

function getDayHeaderClassNames(arg: DayHeaderContentArg): string[] {
  if (arg.view.type !== 'timeGridWeek') return []

  return [
    'fc-week-day-header',
    arg.isToday ? 'fc-week-day-header-today' : 'fc-week-day-header-neutral',
  ]
}

function formatCalendarWeekday(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { weekday: 'short' }

  if (props.timeZone !== DEFAULT_TIME_ZONE) {
    options.timeZone = 'UTC'
  }

  try {
    return new Intl.DateTimeFormat(currentFullCalendarLocale.value, options).format(date)
  } catch {
    delete options.timeZone
    return new Intl.DateTimeFormat(currentFullCalendarLocale.value, options).format(date)
  }
}

function getCalendarDateParts(date: Date) {
  const useUtcParts = props.timeZone !== DEFAULT_TIME_ZONE

  return {
    year: useUtcParts ? date.getUTCFullYear() : date.getFullYear(),
    month: useUtcParts ? date.getUTCMonth() + 1 : date.getMonth() + 1,
    day: useUtcParts ? date.getUTCDate() : date.getDate(),
  }
}

function parseSlotTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null

  return hours * 60 + minutes
}

function minutesToSlotTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60

  return `${padDatePart(hours)}:${padDatePart(remainder)}:00`
}

function getEventStartMinutes(value: EventInput['start']): number | null {
  if (typeof value !== 'string') return null

  const match = /T(\d{2}):(\d{2})/.exec(value)
  if (!match) return null

  return Number(match[1]) * 60 + Number(match[2])
}

function getEarliestEventStartMinutes(events: EventInput[]): number | null {
  let earliest: number | null = null

  for (const event of events) {
    if (event.allDay) continue

    const minutes = getEventStartMinutes(event.start)
    if (minutes === null) continue
    if (earliest === null || minutes < earliest) earliest = minutes
  }

  return earliest
}

function getCalendarSlotDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return `${padDatePart(hours)}:${padDatePart(remainingMinutes)}:00`
}

const calendarOptions = computed<CalendarOptions>(() => {
  const hour12 = props.timeFormat === 12
  const isMonthView = currentViewType.value === 'dayGridMonth'
  const isTimeGridView = isTimeGridViewType(currentViewType.value)
  const timeFormat = {
    hour: hour12 ? 'numeric' : '2-digit',
    minute: '2-digit',
    hour12,
  } as const
  const calendarScheduleDisplay = timeGridScheduleDisplay.value
  const scheduleOptions: Pick<CalendarOptions, 'slotMinTime' | 'slotMaxTime' | 'businessHours'> = {}

  // Extend the grid's top boundary only when an early event needs it (or the
  // schedule itself defines one); otherwise leave slotMinTime unset so an
  // unconfigured schedule still shows the full day.
  if (calendarScheduleDisplay.slotMinTime || gridTopMinutes.value > 0) {
    scheduleOptions.slotMinTime = minutesToSlotTime(gridTopMinutes.value)
  }

  if (calendarScheduleDisplay.slotMaxTime) {
    scheduleOptions.slotMaxTime = calendarScheduleDisplay.slotMaxTime
  }

  if (calendarScheduleDisplay.businessHours) {
    scheduleOptions.businessHours = calendarScheduleDisplay.businessHours
  }

  return {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, scrollGridPlugin],
    locales: [frLocale, ruLocale],
    locale: currentFullCalendarLocale.value,
    initialView: props.defaultView,
    firstDay: props.firstDay,
    height: isMonthView ? 'auto' : '100%',
    // FullCalendar derives a month's row height from width / aspectRatio / 6.
    // With seven columns, 7 / 6 makes an empty day cell square.
    aspectRatio: isMonthView ? 7 / 6 : undefined,
    fixedWeekCount: false,
    showNonCurrentDates: false,
    // Only the mobile week needs horizontally scrollable day columns. Month
    // and day views stay fitted to the full container width.
    dayMinWidth: isMobile.value && currentViewType.value === 'timeGridWeek' ? 160 : undefined,
    nowIndicator: true,
    scrollTime: verticalScrollTime.value,
    editable: !isMonthView,
    selectable: isMobile.value && isTimeGridView,
    selectLongPressDelay: MOBILE_LONG_PRESS_DELAY_MS,
    eventLongPressDelay: isMobile.value ? MOBILE_LONG_PRESS_DELAY_MS : undefined,
    allDaySlot: !isMobile.value,
    allDayText: t('calendar.allDay'),
    timeZone: props.timeZone,
    slotDuration: getCalendarSlotDuration(props.slotStepMinutes),
    slotLabelFormat: timeFormat,
    eventTimeFormat: timeFormat,
    eventOrder: 'start',
    eventOrderStrict: true,
    eventOverlap: true,
    displayEventEnd: true,
    headerToolbar: false,
    dateClick: handleDateClick,
    select: handleDateSelect,
    eventClick: handleEventClick,
    eventDragStart: beginMobileEventEditing,
    eventDragStop: finishMobileEventGesture,
    eventDrop: handleEventDrop,
    eventResizeStart: beginMobileEventEditing,
    eventResizeStop: finishMobileEventGesture,
    eventResize: handleEventResize,
    datesSet: handleDatesSet,
    dayHeaderContent: renderDayHeaderContent,
    dayHeaderClassNames: getDayHeaderClassNames,
    eventClassNames: getEventClassNames,
    slotLaneClassNames: getSlotLaneClassNames,
    slotLaneDidMount: handleSlotLaneMount,
    ...scheduleOptions,
    events: displayedCalendarEvents.value,
  }
})

function getCalendarApi(): CalendarApi | undefined {
  return calendarRef.value?.getApi()
}

function navigateCalendar(method: 'prev' | 'next' | 'today') {
  if (currentViewType.value === 'timeGridWeek') {
    shouldAlignMobileWeekAfterDatesSet = true
  }

  getCalendarApi()?.[method]()
}

function moveToPrevious() {
  navigateCalendar('prev')
}

function moveToNext() {
  navigateCalendar('next')
}

function moveToToday() {
  navigateCalendar('today')
}

function changeView(viewType: CalendarViewType) {
  const previousViewType = currentViewType.value
  currentViewType.value = viewType

  if (viewType === 'timeGridWeek' && previousViewType !== 'timeGridWeek') {
    shouldAlignMobileWeekAfterDatesSet = true
  }

  getCalendarApi()?.changeView(viewType)
}

// `scrollTime` is only guaranteed to re-apply on FullCalendar's own datesSet
// (scrollTimeReset). Watching it explicitly also covers the case where the
// target changes without a range change — e.g. events for the same range
// finish loading and reveal an earlier appointment than the schedule's start.
watch(verticalScrollTime, (value) => {
  if (currentViewType.value === 'dayGridMonth') return
  getCalendarApi()?.scrollToTime(value)
})

defineExpose<CalendarWidgetExpose>({
  moveToPrevious,
  moveToNext,
  moveToToday,
  changeView,
})
</script>

<template>
  <div
    ref="calendarContainerRef"
    class="min-h-0 w-full"
    :class="[
      currentViewType === 'dayGridMonth' ? 'h-auto' : 'h-full',
      {
        'calendar-widget-mobile': isMobile,
        'calendar-event-editing': isMobile && editingEventId,
      },
    ]"
  >
    <FullCalendar :key="calendarRenderKey" ref="calendarRef" :options="calendarOptions">
      <template #eventContent="arg">
        <!-- Month: passive service-colour marker; the day cell handles the click. -->
        <span
          v-if="arg.view.type === 'dayGridMonth'"
          class="app-month-event-marker"
          :style="{ backgroundColor: arg.event.borderColor }"
        />

        <!-- Appointment: card-style body matching the home ScheduleTimeline. -->
        <CalendarAppointmentEventContent
          v-else-if="arg.event.extendedProps.type === 'appointment'"
          :event="arg.event"
          :time-text="arg.timeText"
          :is-mobile="isMobile"
        />

        <!-- Mobile time off mirrors ScheduleTimeline's neutral card. -->
        <div
          v-else-if="isMobile && arg.event.extendedProps.type === 'time-block'"
          class="flex h-full w-full flex-col gap-0.5 overflow-hidden px-2 py-1 text-left"
        >
          <div class="flex items-center gap-1">
            <UIcon name="i-lucide-ban" class="size-3 shrink-0 text-muted" aria-hidden="true" />
            <span class="truncate text-[11px] font-semibold tabular-nums leading-tight">{{
              arg.timeText
            }}</span>
          </div>
          <span class="truncate text-[10px] leading-tight text-muted">{{ arg.event.title }}</span>
        </div>

        <!-- Time blocks / other: FullCalendar's default-style body. -->
        <div v-else class="fc-event-main-frame">
          <div v-if="arg.timeText" class="fc-event-time">{{ arg.timeText }}</div>
          <div class="fc-event-title-container">
            <div class="fc-event-title fc-sticky">
              <span class="truncate">{{ arg.event.title || ' ' }}</span>
            </div>
          </div>
        </div>
      </template>
    </FullCalendar>
  </div>
</template>
