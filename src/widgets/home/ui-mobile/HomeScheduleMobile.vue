<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { IonButton, IonCard, IonIcon, IonSkeletonText } from '@ionic/vue'
import { alertCircleOutline, banOutline, calendarOutline, ellipsisVertical } from 'ionicons/icons'
import {
  getAppointmentAccentColor,
  getEffectiveAppointmentStatus,
  isGroupAppointment,
  useAppointmentsQuery,
  type Appointment,
} from '@entities/appointment'
import { AppointmentBlockMobile } from '@entities/appointment/index.mobile'
import { useClientsQuery } from '@entities/client'
import { useMasterPreferencesStore } from '@entities/master'
import { useServicesQuery, type Service } from '@entities/service'
import { useSessionStore } from '@entities/session'
import { useTimeBlocksQuery } from '@entities/time-block'
import { TimeOffBlockMobile } from '@entities/time-block/index.mobile'
import {
  AppointmentQuickMenuMobile,
  type MobileAppointmentQuickAction,
} from '@features/appointment-actions/index.mobile'
import { useFormats } from '@shared/lib/formats'
import { useLongPress } from '@shared/lib/long-press'
import { hapticImpact } from '@shared/lib/native'
import { useNowMinute } from '@shared/lib/now'
import {
  appointmentMinuteInterval,
  calendarDateForFormatting,
  createTodayScheduleRange,
  minutesInTimeZone,
  timeBlockMinuteInterval,
  timeFromMinutes,
  workingHoursForDate,
} from '../model/home-today-schedule'
import { isVisibleScheduleAppointment } from '../model/schedule-appointments'
import { buildTimelineLayout, type TimelineConstants } from '../model/timeline-layout'

const emit = defineEmits<{
  select: [appointment: Appointment]
  action: [appointment: Appointment, action: MobileAppointmentQuickAction]
}>()

const { t, locale } = useI18n()
const formats = useFormats()
const now = useNowMinute()
const sessionStore = useSessionStore()
const masterStore = useMasterPreferencesStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')
const timeZone = computed(() => masterStore.timeZone)

const todayRange = computed(() => createTodayScheduleRange(now.value, timeZone.value))
const queryRange = computed(() => ({ from: todayRange.value.from, to: todayRange.value.to }))

const appointmentQuery = useAppointmentsQuery(userId, queryRange)
const timeBlockQuery = useTimeBlocksQuery(userId, queryRange)
const clientQuery = useClientsQuery(userId)
const serviceQuery = useServicesQuery(userId)

const appointments = computed(() => appointmentQuery.data.value ?? [])
const timeBlocks = computed(() => timeBlockQuery.data.value ?? [])
const clients = computed(() => clientQuery.data.value ?? [])
const services = computed(() => serviceQuery.data.value ?? [])
const loading = computed(
  () =>
    appointmentQuery.isPending.value ||
    timeBlockQuery.isPending.value ||
    clientQuery.isPending.value ||
    serviceQuery.isPending.value,
)
const hasCoreError = computed(() =>
  Boolean(appointmentQuery.error.value || timeBlockQuery.error.value),
)

const SLOT_HEIGHT = 65
const SLOT_MIN = 60
const GRID_PADDING_TOP = 10
const LABEL_WIDTH = 40
const BLOCK_GAP = 5
const MIN_CARD_HEIGHT = 65
const GAP_THRESHOLD_MIN = 60
const GAP_HEIGHT = 24
const BOTTOM_PADDING = 12

const LAYOUT_CONSTANTS: TimelineConstants = {
  slotHeight: SLOT_HEIGHT,
  slotMin: SLOT_MIN,
  gridPaddingTop: GRID_PADDING_TOP,
  gapThresholdMin: GAP_THRESHOLD_MIN,
  gapHeight: GAP_HEIGHT,
  bottomPadding: BOTTOM_PADDING,
  minBlockHeight: MIN_CARD_HEIGHT + BLOCK_GAP,
}

const serviceById = computed(() => new Map(services.value.map((service) => [service.id, service])))
const clientById = computed(() => new Map(clients.value.map((client) => [client.id, client])))

const visibleAppointments = computed(() =>
  appointments.value.filter(
    (appointment) =>
      isVisibleScheduleAppointment(appointment) &&
      Boolean(appointmentMinuteInterval(appointment, todayRange.value.date, timeZone.value)),
  ),
)
const timedTimeBlocks = computed(() =>
  timeBlocks.value.filter(
    (block) =>
      !block.all_day &&
      Boolean(timeBlockMinuteInterval(block, todayRange.value.date, timeZone.value)),
  ),
)
const allDayTimeBlocks = computed(() => timeBlocks.value.filter((block) => block.all_day))

const workingHours = computed(() => {
  const hours = workingHoursForDate(
    masterStore.preferences.profile?.schedule,
    todayRange.value.date,
  )
  return hours ? { start: hours.from, end: hours.to } : null
})
const nowMinutes = computed(() => minutesInTimeZone(now.value, timeZone.value))

const layout = computed(() =>
  buildTimelineLayout({
    appointments: [
      ...visibleAppointments.value.flatMap((appointment) => {
        const interval = appointmentMinuteInterval(
          appointment,
          todayRange.value.date,
          timeZone.value,
        )
        return interval ? [interval] : []
      }),
      ...timedTimeBlocks.value.flatMap((block) => {
        const interval = timeBlockMinuteInterval(block, todayRange.value.date, timeZone.value)
        return interval ? [interval] : []
      }),
    ],
    workingHours: workingHours.value,
    nowMin: nowMinutes.value,
    constants: LAYOUT_CONSTANTS,
  }),
)

const hasTimedContent = computed(
  () => visibleAppointments.value.length > 0 || timedTimeBlocks.value.length > 0,
)
const hasAnyContent = computed(() => hasTimedContent.value || allDayTimeBlocks.value.length > 0)
const totalHeight = computed(() => layout.value.totalHeight)
const gapSegments = computed(() =>
  layout.value.segments.filter((segment) => segment.kind === 'gap'),
)
const timeSlots = computed(() =>
  layout.value.hourLabels.map((label) => ({
    min: label.min,
    top: label.top,
    value: formats.time(timeFromMinutes(label.min), masterStore.timeFormat),
  })),
)

function clientName(appointment: Appointment): string {
  const client = clientById.value.get(appointment.client_id)
  if (!client) return t('appointments.unknownClient')
  return [client.first_name, client.last_name].filter(Boolean).join(' ')
}

const appointmentBlocks = computed(() =>
  visibleAppointments.value.flatMap((appointment) => {
    const interval = appointmentMinuteInterval(appointment, todayRange.value.date, timeZone.value)
    if (!interval) return []

    const topStart = layout.value.topForMin(interval.from) ?? 0
    const topEnd = layout.value.topForMin(interval.to) ?? topStart
    const selectedServices = appointment.service_ids
      .map((id) => serviceById.value.get(id))
      .filter((service): service is Service => Boolean(service))
    const isGroup = isGroupAppointment(appointment)

    return [
      {
        appointment,
        clientName: clientName(appointment),
        services: selectedServices,
        serviceNames: selectedServices.map((service) => service.name).join(', ') || '—',
        isGroup,
        accentColor: getAppointmentAccentColor(appointment, serviceById.value),
        status: getEffectiveAppointmentStatus(appointment, now.value),
        startLabel: formats.time(timeFromMinutes(interval.from), masterStore.timeFormat),
        timeRange: `${formats.time(
          timeFromMinutes(interval.from),
          masterStore.timeFormat,
        )}–${formats.time(timeFromMinutes(interval.to), masterStore.timeFormat)}`,
        durationLabel: formats.duration(appointment.duration),
        priceLabel: appointment.price == null ? null : formats.price(appointment.price),
        density: !isGroup && appointment.duration < 45 ? ('compact' as const) : ('full' as const),
        top: topStart + BLOCK_GAP / 2,
        height: Math.max(topEnd - topStart - BLOCK_GAP, MIN_CARD_HEIGHT),
      },
    ]
  }),
)

const timeOffBlocks = computed(() =>
  timedTimeBlocks.value.flatMap((block) => {
    const interval = timeBlockMinuteInterval(block, todayRange.value.date, timeZone.value)
    if (!interval) return []
    const topStart = layout.value.topForMin(interval.from) ?? 0
    const topEnd = layout.value.topForMin(interval.to) ?? topStart
    return [
      {
        id: block.id,
        top: topStart + BLOCK_GAP / 2,
        height: Math.max(topEnd - topStart - BLOCK_GAP, MIN_CARD_HEIGHT),
        timeRange: `${formats.time(
          timeFromMinutes(interval.from),
          masterStore.timeFormat,
        )}–${formats.time(timeFromMinutes(interval.to), masterStore.timeFormat)}`,
        label: block.notes || t('timeBlocks.calendarTitle'),
      },
    ]
  }),
)

const nowLine = computed(() => {
  if (!visibleAppointments.value.length) return null
  let top = layout.value.topForMin(nowMinutes.value)
  if (top === null) {
    top =
      nowMinutes.value < layout.value.domain.start
        ? GRID_PADDING_TOP
        : totalHeight.value - BOTTOM_PADDING
  }
  return {
    top,
    label: formats.time(timeFromMinutes(nowMinutes.value), masterStore.timeFormat),
  }
})

const dateLabel = computed(() => {
  const value = new Intl.DateTimeFormat(locale.value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(calendarDateForFormatting(todayRange.value.date))
  return value.charAt(0).toUpperCase() + value.slice(1)
})
const subtitle = computed(() =>
  t('home.schedule.subtitle', {
    date: dateLabel.value,
    n: visibleAppointments.value.length,
  }),
)

const actionAppointment = ref<Appointment | null>(null)
const actionEvent = ref<Event | undefined>(undefined)
const longPress = useLongPress((event, id) => {
  const block = appointmentBlocks.value.find((item) => item.appointment.id === id)
  if (!block) return
  hapticImpact()
  actionEvent.value = event
  actionAppointment.value = block.appointment
})

function openAppointment(appointment: Appointment) {
  if (longPress.consumeClick(appointment.id)) return
  closeActionMenu()
  emit('select', appointment)
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
  emit('action', appointment, action)
}

function retry() {
  void Promise.allSettled([
    appointmentQuery.refetch(),
    timeBlockQuery.refetch(),
    clientQuery.refetch(),
    serviceQuery.refetch(),
  ])
}
</script>

<template>
  <ion-card class="schedule-card" :aria-label="t('home.schedule.title')">
    <header class="schedule-header">
      <div>
        <h2>{{ t('home.schedule.title') }}</h2>
        <p>{{ subtitle }}</p>
      </div>
    </header>

    <div class="schedule-body">
      <div v-if="loading" class="schedule-loading" aria-busy="true">
        <ion-skeleton-text v-for="index in 3" :key="index" :animated="true" />
      </div>

      <div v-else-if="hasCoreError" class="schedule-error" role="alert">
        <ion-icon :icon="alertCircleOutline" color="danger" aria-hidden="true" />
        <span>{{ t('home.schedule.loadError') }}</span>
        <ion-button fill="clear" size="small" @click="retry">
          {{ t('home.schedule.retry') }}
        </ion-button>
      </div>

      <div v-else-if="!hasAnyContent" class="schedule-empty">
        <ion-icon :icon="calendarOutline" color="medium" aria-hidden="true" />
        <p>{{ t('home.upcoming.empty') }}</p>
      </div>

      <template v-else>
        <div
          v-for="block in allDayTimeBlocks"
          :key="`all-day-${block.id}`"
          class="all-day-time-off"
        >
          <ion-icon :icon="banOutline" color="medium" aria-hidden="true" />
          <div>
            <strong>{{ t('timeBlocks.allDayLabel') }}</strong>
            <span>{{ block.notes || t('timeBlocks.calendarTitle') }}</span>
          </div>
        </div>

        <div
          v-if="hasTimedContent"
          class="schedule-timeline"
          :style="{ height: `${totalHeight}px` }"
        >
          <template v-for="slot in timeSlots" :key="slot.min">
            <div
              class="timeline-grid-line"
              :style="{ left: `${LABEL_WIDTH + 8}px`, top: `${slot.top}px` }"
            />
            <span
              class="timeline-time-label"
              :style="{ top: `${slot.top}px`, width: `${LABEL_WIDTH}px` }"
            >
              {{ slot.value }}
            </span>
          </template>

          <div
            v-for="(gap, index) in gapSegments"
            :key="`gap-${index}`"
            class="timeline-gap"
            :style="{
              top: `${gap.top}px`,
              height: `${gap.height}px`,
              left: `${LABEL_WIDTH + 8}px`,
            }"
          >
            <ion-icon :icon="ellipsisVertical" aria-hidden="true" />
          </div>

          <button
            v-for="block in appointmentBlocks"
            :key="block.appointment.id"
            type="button"
            class="schedule-appointment"
            :class="{
              'schedule-appointment--active': longPress.pressedId.value === block.appointment.id,
            }"
            :style="{
              top: `${block.top}px`,
              height: `${block.height}px`,
              left: `${LABEL_WIDTH + 10}px`,
            }"
            :aria-label="`${block.clientName}, ${block.serviceNames}, ${block.timeRange}`"
            @click="openAppointment(block.appointment)"
            @pointerdown="longPress.start($event, block.appointment.id)"
            @pointermove="longPress.move"
            @pointerup="longPress.cancel"
            @pointercancel="longPress.cancel"
            @pointerleave="longPress.cancel"
            @contextmenu.prevent="longPress.trigger($event, block.appointment.id)"
          >
            <appointment-block-mobile
              :client-name="block.clientName"
              :time-range="block.timeRange"
              :start-label="block.startLabel"
              :duration-label="block.durationLabel"
              :service-names="block.serviceNames"
              :services="block.services"
              :price-label="block.priceLabel"
              :accent-color="block.accentColor"
              :status="block.status"
              :is-group="block.isGroup"
              :density="block.density"
              :active="longPress.pressedId.value === block.appointment.id"
            />
          </button>

          <time-off-block-mobile
            v-for="block in timeOffBlocks"
            :key="block.id"
            class="timed-time-off"
            :style="{
              top: `${block.top}px`,
              height: `${block.height}px`,
              left: `${LABEL_WIDTH + 10}px`,
            }"
            :time-range="block.timeRange"
            :label="block.label"
          />

          <div
            v-if="nowLine"
            data-testid="mobile-now-line"
            class="timeline-now-line"
            :style="{ top: `${nowLine.top}px` }"
          >
            <span>{{ nowLine.label }}</span>
            <i aria-hidden="true" />
          </div>
        </div>

        <appointment-quick-menu-mobile
          :is-open="Boolean(actionAppointment)"
          :event="actionEvent"
          @select="selectAction"
          @dismiss="closeActionMenu"
        />
      </template>
    </div>
  </ion-card>
</template>

<style scoped>
.schedule-card {
  margin: 0;
  overflow: hidden;
  border-radius: 16px;
  background: var(--se-surface-card);
  box-shadow: 0 1px 3px rgb(0 0 0 / 6%);
}

.schedule-header {
  padding: 14px 14px 10px;
}

.schedule-header h2,
.schedule-header p,
.schedule-empty p {
  margin: 0;
}

.schedule-header h2 {
  color: var(--ion-text-color);
  font-size: 1rem;
  font-weight: 750;
  line-height: 1.25;
}

.schedule-header p {
  margin-top: 3px;
  color: var(--ion-color-medium);
  font-size: 0.76rem;
  line-height: 1.3;
}

.schedule-body {
  padding: 0 14px 14px;
}

.schedule-loading {
  display: grid;
  gap: 8px;
}

.schedule-loading ion-skeleton-text {
  width: 100%;
  height: 65px;
  margin: 0;
  border-radius: 12px;
}

.schedule-error,
.schedule-empty {
  display: flex;
  min-height: 100px;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--se-separator);
  border-radius: 12px;
  color: var(--ion-color-medium);
}

.schedule-error {
  gap: 6px;
  font-size: 0.8rem;
}

.schedule-error > ion-icon {
  flex: 0 0 auto;
  font-size: 20px;
}

.schedule-error ion-button {
  margin: 0;
  text-transform: none;
}

.schedule-empty {
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  text-align: center;
}

.schedule-empty ion-icon {
  font-size: 28px;
}

.schedule-empty p {
  font-size: 0.82rem;
}

.all-day-time-off {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  padding: 9px 11px;
  border: 1px solid var(--se-separator);
  border-radius: 10px;
  background: var(--se-surface-muted);
}

.all-day-time-off > ion-icon {
  flex: 0 0 auto;
  font-size: 18px;
}

.all-day-time-off div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.all-day-time-off strong {
  font-size: 0.73rem;
}

.all-day-time-off span {
  overflow: hidden;
  color: var(--ion-color-medium);
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-timeline {
  position: relative;
  overflow: hidden;
}

.timeline-grid-line {
  position: absolute;
  right: 0;
  height: 1px;
  background: var(--se-separator);
  opacity: 0.75;
}

.timeline-time-label {
  position: absolute;
  inset-inline-start: 2px;
  transform: translateY(-50%);
  color: var(--ion-color-medium);
  font-size: 0.62rem;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  pointer-events: none;
}

.timeline-gap {
  position: absolute;
  right: 0;
  display: grid;
  color: var(--ion-color-medium);
  opacity: 0.45;
  place-items: center;
}

.timeline-gap ion-icon {
  font-size: 17px;
}

.schedule-appointment,
.timed-time-off {
  position: absolute;
  right: 0;
}

.schedule-appointment {
  z-index: 2;
  display: block;
  width: auto;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: none;
  color: inherit;
  font: inherit;
  touch-action: manipulation;
  user-select: none;
  -webkit-touch-callout: none;
}

.schedule-appointment:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: -2px;
}

.schedule-appointment--active {
  z-index: 4;
}

.timed-time-off {
  z-index: 1;
  pointer-events: none;
}

.timeline-now-line {
  position: absolute;
  right: 0;
  left: 0;
  z-index: 5;
  display: flex;
  transform: translateY(-50%);
  align-items: center;
  gap: 4px;
  pointer-events: none;
}

.timeline-now-line span {
  padding: 2px 5px;
  border-radius: 999px;
  background: var(--ion-color-success);
  color: var(--ion-color-success-contrast);
  font-size: 0.61rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1;
}

.timeline-now-line i {
  height: 2px;
  border-radius: 999px;
  background: var(--ion-color-success);
  flex: 1;
}
</style>
