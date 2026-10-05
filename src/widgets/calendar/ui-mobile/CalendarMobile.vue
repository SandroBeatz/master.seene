<script setup lang="ts">
import type {
  CalendarApi,
  CalendarOptions,
  DateSelectArg,
  DatesSetArg,
  EventApi,
  EventInput,
} from '@fullcalendar/core'
import frLocale from '@fullcalendar/core/locales/fr'
import ruLocale from '@fullcalendar/core/locales/ru'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import scrollGridPlugin from '@fullcalendar/scrollgrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import FullCalendar from '@fullcalendar/vue3'
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getEffectiveAppointmentStatus, type Appointment } from '@entities/appointment'
import { AppointmentBlockMobile } from '@entities/appointment/index.mobile'
import { useMasterPreferencesStore } from '@entities/master'
import type { TimeBlock } from '@entities/time-block'
import { TimeOffBlockMobile } from '@entities/time-block/index.mobile'
import {
  AppointmentQuickMenuMobile,
  type MobileAppointmentQuickAction,
} from '@features/appointment-actions/index.mobile'
import { useFormats } from '@shared/lib/formats'
import { useLongPress } from '@shared/lib/long-press'
import { hapticImpact } from '@shared/lib/native'
import { getDateTimeInputValue, toUtcIsoFromCalendarDateString } from '@shared/lib/time-zone'
import type { CalendarAppointmentEventDetails } from '../model/calendar-events'
import type { CalendarDateRange, CalendarViewType } from '../model/calendar-controls'
import { normalizeCalendarLocale } from '../model/calendar-locale'
import {
  getAppointmentDates,
  getMobileCalendarEventDensity,
  getMobileCalendarScrollTime,
  getMobileCalendarSlotHeight,
  getWorkdayStart,
  MOBILE_CALENDAR_DEFAULT_VIEW,
  MOBILE_CALENDAR_WEEK_DAY_WIDTH_PX,
  resolveMobileTimeGridBounds,
} from '../model/calendar-mobile'
import { getCalendarDateString, toCalendarDateRange } from '../model/calendar-range'
import { buildCalendarScheduleDisplay } from '../model/calendar-schedule'
import { useMobileCalendarEvents } from '../model/use-mobile-calendar-events'
import CalendarWeekStripMobile from './CalendarWeekStripMobile.vue'
import { useCalendarSwipe } from './use-calendar-swipe'

/** How a view switch enters: drill into a day, back out of it, or a soft fade. */
export type CalendarViewTransition = 'zoom-in' | 'zoom-out' | 'fade'

const VIEW_ENTER_KEYFRAMES: Record<CalendarViewTransition, Keyframe[]> = {
  'zoom-in': [
    { opacity: 0, transform: 'scale(0.94)' },
    { opacity: 1, transform: 'scale(1)' },
  ],
  'zoom-out': [
    { opacity: 0, transform: 'scale(1.05)' },
    { opacity: 1, transform: 'scale(1)' },
  ],
  fade: [
    { opacity: 0, transform: 'translateY(6px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ],
}

// Native-feeling FullCalendar for the Ionic build: month (service-coloured
// stripes), week (fixed-width, 2D-scrolling day columns) and day (full width).
// Time-grid cards are the same AppointmentBlockMobile the home schedule uses.
// The page owns the header and drives navigation through the exposed API.
const props = withDefaults(
  defineProps<{
    initialView?: CalendarViewType
    /** `YYYY-MM-DD` the calendar opens on (today by default). */
    initialDate?: string
  }>(),
  { initialView: MOBILE_CALENDAR_DEFAULT_VIEW, initialDate: undefined },
)

const emit = defineEmits<{
  'range-change': [range: CalendarDateRange]
  /** A month cell or week day header was tapped — `YYYY-MM-DD`, master's zone. */
  'day-select': [date: string]
  'appointment-select': [appointment: Appointment]
  'appointment-action': [appointment: Appointment, action: MobileAppointmentQuickAction]
  'time-block-select': [timeBlock: TimeBlock]
  /** Long press on an empty slot — UTC ISO start for a new booking. */
  'slot-hold': [startAt: string]
}>()

interface CalendarAppointmentEventProps extends CalendarAppointmentEventDetails {
  type: 'appointment'
}

interface CalendarTimeBlockEventProps {
  type: 'time-block'
  timeBlock: TimeBlock
}

const { t, locale } = useI18n()
const formats = useFormats()
const masterStore = useMasterPreferencesStore()
const { events, now, isLoading, error, setVisibleRange, refetch } = useMobileCalendarEvents()

const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null)
const rootRef = ref<HTMLElement | null>(null)
const gridRef = ref<HTMLElement | null>(null)
const currentView = ref<CalendarViewType>(props.initialView)
const isTimeGrid = computed(() => currentView.value !== 'dayGridMonth')
let alignWeekOnNextRange = props.initialView === 'timeGridWeek'
// Re-focus the time grid (now / start of the workday) after opening a view or
// jumping; plain prev/next paging keeps the vertical position like iOS.
let focusOnNextRange = true

const timeZone = computed(() => masterStore.timeZone)
const fullCalendarLocale = computed(() => normalizeCalendarLocale(locale.value))
const scheduleDisplay = computed(() =>
  buildCalendarScheduleDisplay(masterStore.preferences.profile?.schedule),
)
const gridBounds = computed(() => resolveMobileTimeGridBounds(scheduleDisplay.value, events.value))
// Wall-clock bounds of the rendered range — the all-day row only shows when
// something all-day falls inside it. FullCalendar stops painting all-day events
// if `allDaySlot` is toggled at runtime, so the slot stays on and an empty row
// is collapsed with CSS instead (then the grid re-measures).
const visibleWindow = ref({ start: '', end: '' })
const hasAllDayEvents = computed(() =>
  events.value.some(
    (event) =>
      event.allDay &&
      String(event.start) < visibleWindow.value.end &&
      String(event.end) > visibleWindow.value.start,
  ),
)
// Breaks are recurring timed background events: meaningful on the time grid,
// but on the month grid they would tint whole day cells.
const displayedEvents = computed<EventInput[]>(() =>
  isTimeGrid.value ? [...events.value, ...scheduleDisplay.value.backgroundEvents] : events.value,
)

// Options FullCalendar only reads when a view is built — changing them
// re-creates the calendar instead of patching it.
const renderKey = computed(() =>
  JSON.stringify({
    locale: fullCalendarLocale.value,
    timeZone: timeZone.value,
    firstDay: masterStore.calendarFirstDay,
    slotStep: masterStore.calendarSlotStepMinutes,
    timeFormat: masterStore.timeFormat,
  }),
)

const shownDate = computed(() => visibleWindow.value.start.slice(0, 10))
const todayDate = computed(() => getDateTimeInputValue(now.value, timeZone.value).date)
const appointmentDates = computed(() => getAppointmentDates(events.value))
const isDayView = computed(() => currentView.value === 'timeGridDay')

// The grid's box changes when the all-day row collapses or the day view's
// week strip comes and goes — FullCalendar only re-measures on request.
watch([hasAllDayEvents, isDayView], () => void nextTick(() => getCalendarApi()?.updateSize()))

const { slide } = useCalendarSwipe({
  target: gridRef,
  surface: () => gridRef.value?.querySelector<HTMLElement>('.fc-view-harness') ?? null,
  enabled: () => currentView.value !== 'timeGridWeek' && !actionAppointment.value,
  onPage: (direction) => (direction === 'next' ? next() : prev()),
})

function selectStripDate(date: string) {
  void slide(date > shownDate.value ? 'next' : 'prev', () => getCalendarApi()?.gotoDate(date))
}

const actionAppointment = ref<Appointment | null>(null)
const actionEvent = shallowRef<Event | undefined>(undefined)
const longPress = useLongPress((event, id) => {
  const appointment = findAppointment(id)
  if (!appointment) return
  hapticImpact()
  actionEvent.value = event
  actionAppointment.value = appointment
})

function getCalendarApi(): CalendarApi | undefined {
  return calendarRef.value?.getApi()
}

function findAppointment(id: string): Appointment | undefined {
  const event = getCalendarApi()?.getEventById(id)
  const props = event?.extendedProps as Partial<CalendarAppointmentEventProps> | undefined
  return props?.type === 'appointment' ? props.appointment : undefined
}

function formatClock(value: string | Date): string {
  const iso = value instanceof Date ? value.toISOString() : value
  const { time } = getDateTimeInputValue(iso, timeZone.value)
  return formats.time(time, masterStore.timeFormat)
}

function appointmentBlock(event: EventApi) {
  const details = event.extendedProps as CalendarAppointmentEventProps
  const { appointment } = details
  const start = new Date(appointment.start_at)
  const end = new Date(start.getTime() + appointment.duration * 60_000)
  const startLabel = formatClock(start)

  return {
    clientName: details.clientName,
    timeRange: `${startLabel}–${formatClock(end)}`,
    startLabel,
    durationLabel: formats.duration(appointment.duration),
    serviceNames: details.serviceNames || '—',
    services: details.serviceList.map((service, index) => ({ id: String(index), ...service })),
    priceLabel: appointment.price == null ? null : formats.price(appointment.price),
    accentColor: details.isGroup ? null : event.borderColor,
    status: getEffectiveAppointmentStatus(appointment, now.value),
    isGroup: details.isGroup,
    density: getMobileCalendarEventDensity(appointment.duration),
  }
}

function timeOffBlock(event: EventApi) {
  const { timeBlock } = event.extendedProps as CalendarTimeBlockEventProps
  const minutes =
    (new Date(timeBlock.end_at).getTime() - new Date(timeBlock.start_at).getTime()) / 60_000

  // The all-day row already says "all day" — the pill only needs the note.
  if (event.allDay) return { timeRange: event.title, label: '', micro: true }

  return {
    timeRange: `${formatClock(timeBlock.start_at)}–${formatClock(timeBlock.end_at)}`,
    label: event.title,
    micro: getMobileCalendarEventDensity(minutes) !== 'full',
  }
}

// Month cells are ~50px wide: the first name is what fits and what scans.
function stripeLabel(event: EventApi): string {
  const { clientName } = event.extendedProps as CalendarAppointmentEventProps
  return clientName.split(' ')[0] ?? clientName
}

function eventType(event: EventApi): 'appointment' | 'time-block' | undefined {
  return (event.extendedProps as { type?: 'appointment' | 'time-block' }).type
}

function openAppointment(event: EventApi) {
  if (longPress.consumeClick(event.id)) return
  closeActionMenu()
  const appointment = findAppointment(event.id)
  if (appointment) emit('appointment-select', appointment)
}

function openTimeBlock(event: EventApi) {
  emit('time-block-select', (event.extendedProps as CalendarTimeBlockEventProps).timeBlock)
}

function closeActionMenu() {
  actionAppointment.value = null
  actionEvent.value = undefined
  longPress.release()
}

function selectAction(action: MobileAppointmentQuickAction) {
  const appointment = actionAppointment.value
  if (!appointment) return
  closeActionMenu()
  emit('appointment-action', appointment, action)
}

function handleDateClick(info: DateClickArg) {
  if (info.view.type !== 'dayGridMonth') return
  emit('day-select', info.dateStr.slice(0, 10))
}

function handleSelect(info: DateSelectArg) {
  info.view.calendar.unselect()
  hapticImpact('medium')
  emit('slot-hold', toUtcIsoFromCalendarDateString(info.startStr, timeZone.value))
}

function handleDatesSet(info: DatesSetArg) {
  const range = toCalendarDateRange(info, timeZone.value)
  currentView.value = range.viewType
  visibleWindow.value = { start: info.startStr.slice(0, 19), end: info.endStr.slice(0, 19) }
  closeActionMenu()
  setVisibleRange(range)
  emit('range-change', range)

  if (alignWeekOnNextRange) {
    alignWeekOnNextRange = false
    void nextTick(alignWeek)
  }
  if (focusOnNextRange) {
    focusOnNextRange = false
    // FullCalendar applies its own scroll once the new view has laid out —
    // after this hook and after the next tick — so focus after paint.
    if (range.viewType !== 'dayGridMonth') afterPaint(focusTimeGrid)
  }
}

// A new week opens on its first day — or, inside the current week, on today,
// the column the master actually wants.
function alignWeek() {
  if (currentView.value !== 'timeGridWeek') return
  const columns = rootRef.value?.querySelectorAll<HTMLElement>(
    '.fc-timegrid-col:not(.fc-timegrid-axis)',
  )
  const first = columns?.[0]
  const target = [...(columns ?? [])].find((column) => column.classList.contains('fc-day-today'))
  const scroller = first?.closest<HTMLElement>('.fc-scroller')
  if (!first || !scroller) return
  scroller.scrollLeft = target ? target.offsetLeft - first.offsetLeft : 0
}

function nowLabel(): string {
  return formatClock(now.value)
}

function afterPaint(callback: () => void) {
  requestAnimationFrame(() => requestAnimationFrame(callback))
}

function focusTimeGrid() {
  const { date, time } = getDateTimeInputValue(now.value, timeZone.value)
  const visible = visibleWindow.value
  const todayInView = date >= visible.start.slice(0, 10) && date < visible.end.slice(0, 10)
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  const businessHours = scheduleDisplay.value.businessHours

  const target = getMobileCalendarScrollTime({
    bounds: gridBounds.value,
    workdayStart: getWorkdayStart(Array.isArray(businessHours) ? businessHours : undefined),
    nowMinutes: todayInView ? hours * 60 + minutes : undefined,
  })

  // `CalendarApi.scrollToTime` does not reach the scrollgrid body scroller on
  // touch layouts, so scroll it directly to the slot row; the time axis
  // scroller follows through scrollgrid's own scroll syncing.
  const slot = rootRef.value?.querySelector<HTMLElement>(
    `.fc-timegrid-slot-lane[data-time="${target}"]`,
  )
  const scroller = slot?.closest<HTMLElement>('.fc-scroller')
  if (!slot || !scroller) return
  scroller.scrollTop += slot.getBoundingClientRect().top - scroller.getBoundingClientRect().top
}

// FullCalendar dates are UTC-coerced under a named zone; read the wall date.
function weekHeader(date: Date) {
  const wallDate = getCalendarDateString(date, timeZone.value).slice(0, 10)
  const weekday = new Intl.DateTimeFormat(locale.value, {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${wallDate}T12:00:00Z`))

  return { date: wallDate, weekday, day: Number(wallDate.slice(8, 10)) }
}

const calendarOptions = computed<CalendarOptions>(() => {
  const hour12 = masterStore.timeFormat === 12
  const timeFormat = {
    hour: hour12 ? 'numeric' : '2-digit',
    minute: '2-digit',
    hour12,
  } as const

  return {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, scrollGridPlugin],
    locales: [frLocale, ruLocale],
    locale: fullCalendarLocale.value,
    timeZone: timeZone.value,
    firstDay: masterStore.calendarFirstDay,
    initialView: props.initialView,
    initialDate: props.initialDate,
    headerToolbar: false,
    height: '100%',
    expandRows: true,
    handleWindowResize: true,
    fixedWeekCount: false,
    showNonCurrentDates: false,
    moreLinkContent: (arg) => `+${arg.num}`,
    nowIndicator: true,
    allDaySlot: true,
    slotDuration: { minutes: masterStore.calendarSlotStepMinutes },
    slotLabelInterval: { hours: 1 },
    slotLabelFormat: timeFormat,
    eventTimeFormat: timeFormat,
    slotMinTime: gridBounds.value.slotMinTime,
    slotMaxTime: gridBounds.value.slotMaxTime,
    businessHours: scheduleDisplay.value.businessHours,
    scrollTimeReset: false,
    slotEventOverlap: false,
    eventMinHeight: 20,
    eventOrder: 'start',
    editable: false,
    // Long press on an empty slot creates a booking there (iOS Calendar-style);
    // a plain tap only scrolls, so nothing opens by accident.
    selectable: true,
    selectMirror: false,
    selectLongPressDelay: 500,
    selectAllow: (info) => !info.allDay,
    views: {
      dayGridMonth: {
        eventDisplay: 'block',
        dayHeaderFormat: { weekday: 'short' },
        // Fit stripes to the cell height and fold the rest into "+N".
        dayMaxEventRows: true,
        // Cells are tap targets (→ day); a date-range drag would only fight
        // the swipe paging gesture.
        selectable: false,
      },
      timeGridWeek: { dayMinWidth: MOBILE_CALENDAR_WEEK_DAY_WIDTH_PX },
      timeGridDay: { dayHeaders: false },
    },
    // Ionic's tap-click marks `.ion-activatable` with `.ion-activated` on touch,
    // giving month cells the same pressed state as native list rows.
    dayCellClassNames: (arg) =>
      arg.view.type === 'dayGridMonth' && !arg.isDisabled ? ['ion-activatable'] : [],
    dateClick: handleDateClick,
    select: handleSelect,
    datesSet: handleDatesSet,
    events: displayedEvents.value,
  }
})

function prev() {
  alignWeekOnNextRange = currentView.value === 'timeGridWeek'
  getCalendarApi()?.prev()
}

function next() {
  alignWeekOnNextRange = currentView.value === 'timeGridWeek'
  getCalendarApi()?.next()
}

// FullCalendar swaps the view synchronously, so the new content is already in
// place: play an enter animation on it (and the week strip) right away.
function animateEnter(transition: CalendarViewTransition) {
  const root = rootRef.value
  if (!root || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  root.animate(VIEW_ENTER_KEYFRAMES[transition], {
    duration: transition === 'fade' ? 220 : 280,
    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  })
}

function today() {
  alignWeekOnNextRange = currentView.value === 'timeGridWeek'
  focusOnNextRange = true
  getCalendarApi()?.today()
  animateEnter('fade')
}

/** Switches view and/or date (`YYYY-MM-DD`); keeps the date when omitted. */
function show(view: CalendarViewType, date?: string, transition: CalendarViewTransition = 'fade') {
  alignWeekOnNextRange = view === 'timeGridWeek'
  focusOnNextRange = true
  getCalendarApi()?.changeView(view, date)
  animateEnter(transition)
}

defineExpose({ prev, next, today, show, refetch, isLoading, error })
</script>

<template>
  <div
    ref="rootRef"
    class="se-calendar"
    :class="[`se-calendar--${currentView}`, { 'se-calendar--no-all-day': !hasAllDayEvents }]"
    :style="{
      '--se-calendar-slot-height': `${getMobileCalendarSlotHeight(masterStore.calendarSlotStepMinutes)}px`,
    }"
  >
    <calendar-week-strip-mobile
      v-if="isDayView && shownDate"
      :date="shownDate"
      :today="todayDate"
      :first-day="masterStore.calendarFirstDay"
      :marked-dates="appointmentDates"
      @select="selectStripDate"
    />

    <div ref="gridRef" class="se-calendar__grid">
      <FullCalendar :key="renderKey" ref="calendarRef" :options="calendarOptions">
        <template #dayHeaderContent="arg">
          <button
            v-if="arg.view.type === 'timeGridWeek'"
            type="button"
            class="se-calendar__week-head"
            @click="emit('day-select', weekHeader(arg.date).date)"
          >
            <small>{{ weekHeader(arg.date).weekday }}</small>
            <strong>{{ weekHeader(arg.date).day }}</strong>
          </button>
          <span v-else class="se-calendar__month-head">{{ arg.text }}</span>
        </template>

        <template #dayCellContent="arg">
          <span v-if="arg.view.type === 'dayGridMonth'" class="se-calendar__day-number">{{
            getCalendarDateString(arg.date, timeZone).slice(8, 10).replace(/^0/, '')
          }}</span>
        </template>

        <template #allDayContent>
          <span class="se-calendar__all-day">{{ t('calendar.allDay') }}</span>
        </template>

        <template #nowIndicatorContent="arg">
          <span v-if="arg.isAxis" class="se-calendar__now-pill">{{ nowLabel() }}</span>
        </template>

        <template #eventContent="arg">
          <span
            v-if="arg.view.type === 'dayGridMonth'"
            class="se-calendar__stripe"
            :class="{ 'se-calendar__stripe--muted': eventType(arg.event) === 'time-block' }"
            :style="{ '--se-stripe-color': arg.event.borderColor }"
          >
            {{ eventType(arg.event) === 'appointment' ? stripeLabel(arg.event) : arg.event.title }}
          </span>

          <div
            v-else-if="eventType(arg.event) === 'appointment'"
            class="se-calendar__event"
            role="button"
            tabindex="0"
            @click.stop="openAppointment(arg.event)"
            @keydown.enter="openAppointment(arg.event)"
            @pointerdown="longPress.start($event, arg.event.id)"
            @pointermove="longPress.move"
            @pointerup="longPress.cancel"
            @pointercancel="longPress.cancel"
            @pointerleave="longPress.cancel"
            @contextmenu.prevent="longPress.trigger($event, arg.event.id)"
          >
            <appointment-block-mobile
              v-bind="appointmentBlock(arg.event)"
              :active="longPress.pressedId.value === arg.event.id"
            />
          </div>

          <div
            v-else-if="eventType(arg.event) === 'time-block'"
            class="se-calendar__event"
            role="button"
            tabindex="0"
            @click.stop="openTimeBlock(arg.event)"
            @keydown.enter="openTimeBlock(arg.event)"
          >
            <time-off-block-mobile v-bind="timeOffBlock(arg.event)" />
          </div>
        </template>
      </FullCalendar>
    </div>

    <appointment-quick-menu-mobile
      :is-open="Boolean(actionAppointment)"
      :event="actionEvent"
      @select="selectAction"
      @dismiss="closeActionMenu"
    />
  </div>
</template>

<style scoped>
.se-calendar {
  --se-calendar-bg: var(--se-surface-card);
  --se-calendar-line: var(--se-separator);
  --se-calendar-muted: var(--ion-color-medium);
  --se-calendar-today: var(--ion-color-primary);
  --se-calendar-axis-width: 48px;

  position: relative;
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  background: var(--se-calendar-bg);
  color: var(--ion-text-color);
  user-select: none;
  -webkit-touch-callout: none;
}

.se-calendar__grid {
  position: relative;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

/* ---- FullCalendar theme (its own CSS variables first) ---- */
.se-calendar :deep(.fc) {
  --fc-border-color: var(--se-calendar-line);
  --fc-page-bg-color: var(--se-calendar-bg);
  --fc-neutral-bg-color: var(--se-surface-muted);
  --fc-today-bg-color: transparent;
  --fc-now-indicator-color: var(--ion-color-success);
  --fc-non-business-color: color-mix(in srgb, var(--ion-text-color) 3.5%, transparent);
  --fc-highlight-color: color-mix(in srgb, var(--ion-color-primary) 18%, transparent);
  --fc-event-bg-color: transparent;
  --fc-event-border-color: transparent;
  --fc-small-font-size: 0.7rem;

  height: 100%;
  font-family: inherit;
}

.se-calendar :deep(.fc .fc-scrollgrid),
.se-calendar :deep(.fc .fc-scrollgrid-section > td),
.se-calendar :deep(.fc-theme-standard td),
.se-calendar :deep(.fc-theme-standard th) {
  border-color: var(--se-calendar-line);
}

.se-calendar :deep(.fc .fc-scrollgrid) {
  border-inline: 0;
  border-top: 0;
}

/* Premium scrollgrid notice — the week view's fixed-width day columns rely on
   @fullcalendar/scrollgrid exactly like the desktop calendar does. */
.se-calendar :deep(.fc .fc-license-message) {
  display: none;
}

.se-calendar :deep(.fc-scroller) {
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.se-calendar :deep(.fc-scroller::-webkit-scrollbar) {
  display: none;
}

/* ---- Column headers ---- */
.se-calendar :deep(.fc .fc-col-header-cell) {
  border-inline: 0;
  background: var(--se-calendar-bg);
}

.se-calendar :deep(.fc .fc-col-header-cell-cushion) {
  padding: 6px 0;
  color: inherit;
  text-decoration: none;
}

.se-calendar__month-head {
  color: var(--se-calendar-muted);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.se-calendar__week-head {
  display: inline-flex;
  border: 0;
  border-radius: 999px;
  background: none;
  color: inherit;
  font: inherit;
  align-items: center;
  gap: 6px;
  padding: 3px 4px;
}

.se-calendar__week-head small {
  color: var(--se-calendar-muted);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: capitalize;
}

.se-calendar__week-head strong {
  display: inline-grid;
  min-width: 26px;
  height: 26px;
  border-radius: 999px;
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  place-items: center;
}

.se-calendar :deep(.fc-day-today .se-calendar__week-head strong) {
  background: var(--se-calendar-today);
  color: var(--ion-color-primary-contrast);
}

/* ---- Month grid ---- */
/* Rows only, like iOS: vertical rules make a phone-width month look caged. */
.se-calendar--dayGridMonth :deep(.fc-theme-standard td),
.se-calendar--dayGridMonth :deep(.fc-theme-standard th) {
  border-inline: 0;
}

.se-calendar :deep(.fc-daygrid-day) {
  transition: background-color 160ms ease;
}

.se-calendar :deep(.fc-daygrid-day.ion-activated) {
  background: var(--se-surface-muted);
}

.se-calendar :deep(.fc-daygrid-day.fc-day-disabled) {
  background: transparent;
}

.se-calendar :deep(.fc .fc-daygrid-day-top) {
  flex-direction: row;
  justify-content: center;
  padding-top: 4px;
}

.se-calendar :deep(.fc .fc-daygrid-day-number) {
  padding: 0;
  color: inherit;
  text-decoration: none;
}

.se-calendar__day-number {
  display: inline-grid;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  place-items: center;
}

.se-calendar :deep(.fc-day-today .se-calendar__day-number) {
  background: var(--se-calendar-today);
  color: var(--ion-color-primary-contrast);
}

.se-calendar :deep(.fc-day-sat .se-calendar__day-number),
.se-calendar :deep(.fc-day-sun .se-calendar__day-number) {
  color: var(--se-calendar-muted);
}

.se-calendar :deep(.fc-day-today.fc-day-sat .se-calendar__day-number),
.se-calendar :deep(.fc-day-today.fc-day-sun .se-calendar__day-number) {
  color: var(--ion-color-primary-contrast);
}

.se-calendar :deep(.fc .fc-daygrid-day-events) {
  margin: 2px 0 0;
}

.se-calendar :deep(.fc .fc-daygrid-event-harness) {
  margin: 0 2px 2px;
}

/* Whole cell is the tap target (→ day view): stripes don't capture touches. */
.se-calendar :deep(.fc-daygrid-event),
.se-calendar :deep(.fc-daygrid-more-link) {
  pointer-events: none;
}

.se-calendar :deep(.fc .fc-daygrid-event) {
  margin: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  box-shadow: none;
}

.se-calendar__stripe {
  display: block;
  overflow: hidden;
  padding: 1px 4px 1px 5px;
  border-inline-start: 3px solid var(--se-stripe-color);
  border-radius: 4px;
  background: color-mix(in srgb, var(--se-stripe-color) 18%, var(--se-calendar-bg));
  color: var(--ion-text-color);
  font-size: 0.62rem;
  font-weight: 600;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.se-calendar__stripe--muted {
  border-inline-start-color: var(--se-calendar-line);
  background: var(--se-surface-muted);
  color: var(--se-calendar-muted);
}

.se-calendar :deep(.fc .fc-daygrid-more-link) {
  display: block;
  margin: 0 2px;
  color: var(--se-calendar-muted);
  font-size: 0.62rem;
  font-weight: 700;
  text-align: center;
}

.se-calendar :deep(.fc .fc-daygrid-day-bottom) {
  padding: 0;
}

/* ---- Time grid ---- */
/* Empty all-day row + its divider (the non-header, non-body section). */
.se-calendar--no-all-day
  :deep(.fc-timegrid .fc-scrollgrid-section-body:not(.fc-scrollgrid-section-liquid)),
.se-calendar--no-all-day
  :deep(
    .fc-timegrid
      .fc-scrollgrid-section:not(.fc-scrollgrid-section-header):not(.fc-scrollgrid-section-body)
  ) {
  display: none;
}

/* Week: day columns settle on the left edge after a horizontal fling. Only the
   grid body scroller overflows sideways, so the time axis is unaffected. */
.se-calendar--timeGridWeek :deep(.fc-scroller-liquid-absolute) {
  scroll-snap-type: x proximity;
}

.se-calendar--timeGridWeek :deep(.fc-timegrid-col:not(.fc-timegrid-axis)) {
  scroll-snap-align: start;
}

/* Rows take exactly the scale's height: FullCalendar props empty cells open
   with a font-sized &nbsp;, which would otherwise stretch short slots. */
.se-calendar :deep(.fc .fc-timegrid-slot) {
  height: var(--se-calendar-slot-height);
  border-bottom: 0;
  font-size: 0;
  line-height: 0;
}

.se-calendar :deep(.fc .fc-timegrid-slot-minor) {
  border-top-style: dotted;
  border-top-color: color-mix(in srgb, var(--se-calendar-line) 70%, transparent);
}

.se-calendar :deep(.fc .fc-timegrid-axis),
.se-calendar :deep(.fc .fc-timegrid-slot-label) {
  width: var(--se-calendar-axis-width);
  border: 0;
}

.se-calendar :deep(.fc .fc-timegrid-slot-label-cushion) {
  padding-inline-end: 6px;
  line-height: 1;
  color: var(--se-calendar-muted);
  font-size: 0.62rem;
  font-variant-numeric: tabular-nums;
  transform: translateY(-50%);
}

.se-calendar :deep(.fc .fc-timegrid-slot-label-frame) {
  text-align: end;
}

.se-calendar :deep(.fc .fc-timegrid-axis-cushion) {
  color: var(--se-calendar-muted);
  font-size: 0.6rem;
}

.se-calendar :deep(.fc .fc-timegrid-col.fc-day-today) {
  background: color-mix(in srgb, var(--se-calendar-today) 4%, transparent);
}

.se-calendar :deep(.fc .fc-timegrid-col-events) {
  margin: 0 3px 0 2px;
}

.se-calendar :deep(.fc .fc-bg-event.fc-schedule-break) {
  background: repeating-linear-gradient(
    -45deg,
    transparent 0 6px,
    color-mix(in srgb, var(--se-calendar-line) 70%, transparent) 6px 7px
  );
  opacity: 1;
}

/* FullCalendar paints each event's border/background colours inline; our
   cards and stripes draw their own surface, so the inline paint must yield. */
.se-calendar :deep(.fc .fc-event) {
  border-color: transparent !important;
  background-color: transparent !important;
  box-shadow: none;
}

.se-calendar :deep(.fc .fc-timegrid-event-harness-inset .fc-timegrid-event) {
  box-shadow: none;
}

.se-calendar :deep(.fc .fc-timegrid-event .fc-event-main) {
  padding: 1px 0;
}

.se-calendar__event {
  height: 100%;
  min-height: 20px;
  outline: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.se-calendar__event:focus-visible :deep(> *) {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: -2px;
}

.se-calendar :deep(.fc .fc-timegrid-now-indicator-line) {
  border-width: 2px 0 0;
}

.se-calendar :deep(.fc .fc-timegrid-now-indicator-arrow) {
  border: 0;
  margin: 0;
  transform: translateY(-50%);
}

.se-calendar__all-day {
  display: block;
  padding-inline-end: 6px;
  color: var(--se-calendar-muted);
  font-size: 0.58rem;
  line-height: 1.15;
  text-align: end;
  white-space: normal;
}

.se-calendar__now-pill {
  display: block;
  margin-inline-start: 4px;
  padding: 2px 5px;
  border-radius: 999px;
  background: var(--ion-color-success);
  color: var(--ion-color-success-contrast);
  font-size: 0.58rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1.1;
}

.se-calendar :deep(.fc .fc-highlight) {
  border-radius: 8px;
}

@media (prefers-reduced-motion: reduce) {
  .se-calendar :deep(.fc-daygrid-day) {
    transition: none;
  }
}
</style>
