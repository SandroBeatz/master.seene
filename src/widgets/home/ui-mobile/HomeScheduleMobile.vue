<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonButton,
  IonCard,
  IonIcon,
  IonItem,
  IonLabel,
  IonPopover,
  IonSkeletonText,
} from '@ionic/vue'
import {
  alertCircleOutline,
  banOutline,
  calendarOutline,
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  createOutline,
  ellipsisVertical,
  eyeOutline,
  hourglassOutline,
  trashOutline,
  timeOutline,
} from 'ionicons/icons'
import {
  getAppointmentAccentColor,
  getEffectiveAppointmentStatus,
  isGroupAppointment,
  useAppointmentsQuery,
  type Appointment,
  type EffectiveAppointmentStatus,
} from '@entities/appointment'
import { useClientsQuery } from '@entities/client'
import { useMasterPreferencesStore } from '@entities/master'
import { useServicesQuery, type Service } from '@entities/service'
import { useSessionStore } from '@entities/session'
import { useTimeBlocksQuery } from '@entities/time-block'
import { useFormats } from '@shared/lib/formats'
import { useNowMinute } from '@shared/lib/now'
import { InsetList } from '@shared/ui/inset-list/index.mobile'
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
  action: [appointment: Appointment, action: 'details' | 'edit' | 'delete']
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

function statusMeta(status: EffectiveAppointmentStatus) {
  switch (status) {
    case 'pending':
      return { icon: timeOutline, color: 'warning' }
    case 'confirmed':
      return { icon: checkmarkCircleOutline, color: 'tertiary' }
    case 'ongoing':
      return { icon: hourglassOutline, color: 'success' }
    case 'completed':
      return { icon: checkmarkDoneOutline, color: 'success' }
    default:
      return { icon: checkmarkDoneOutline, color: 'medium' }
  }
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
    const effectiveStatus = getEffectiveAppointmentStatus(appointment, now.value)

    return [
      {
        appointment,
        clientName: clientName(appointment),
        services: selectedServices,
        serviceNames: selectedServices.map((service) => service.name).join(', ') || '—',
        isGroup,
        accentColor: getAppointmentAccentColor(appointment, serviceById.value),
        status: statusMeta(effectiveStatus),
        statusLabel: t(`appointments.status.${effectiveStatus}`),
        startLabel: formats.time(timeFromMinutes(interval.from), masterStore.timeFormat),
        timeRange: `${formats.time(
          timeFromMinutes(interval.from),
          masterStore.timeFormat,
        )}–${formats.time(timeFromMinutes(interval.to), masterStore.timeFormat)}`,
        durationLabel: formats.duration(appointment.duration),
        priceLabel: appointment.price == null ? null : formats.price(appointment.price),
        compact: !isGroup && appointment.duration < 45,
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

const HOLD_DELAY_MS = 550
const HOLD_MOVE_TOLERANCE_PX = 10
const pressedAppointmentId = ref<string | null>(null)
const actionAppointment = ref<Appointment | null>(null)
const actionEvent = ref<Event | undefined>(undefined)
let holdTimer: ReturnType<typeof setTimeout> | undefined
let holdStartX = 0
let holdStartY = 0
let suppressClickId: string | null = null

function clearHoldTimer() {
  if (holdTimer) clearTimeout(holdTimer)
  holdTimer = undefined
}

function cancelAppointmentHold() {
  clearHoldTimer()
  if (!actionAppointment.value) pressedAppointmentId.value = null
}

function startAppointmentHold(event: PointerEvent, appointment: Appointment) {
  if (event.pointerType === 'mouse' && event.button !== 0) return

  clearHoldTimer()
  suppressClickId = null
  pressedAppointmentId.value = appointment.id
  holdStartX = event.clientX
  holdStartY = event.clientY

  holdTimer = setTimeout(() => {
    holdTimer = undefined
    suppressClickId = appointment.id
    actionEvent.value = event
    actionAppointment.value = appointment
  }, HOLD_DELAY_MS)
}

function trackAppointmentHold(event: PointerEvent) {
  if (!holdTimer) return
  const movedX = Math.abs(event.clientX - holdStartX)
  const movedY = Math.abs(event.clientY - holdStartY)
  if (movedX > HOLD_MOVE_TOLERANCE_PX || movedY > HOLD_MOVE_TOLERANCE_PX) {
    cancelAppointmentHold()
  }
}

function openAppointment(appointment: Appointment) {
  clearHoldTimer()
  if (suppressClickId === appointment.id) {
    suppressClickId = null
    return
  }
  if (actionAppointment.value) closeActionMenu()
  pressedAppointmentId.value = null
  emit('select', appointment)
}

function openActionsFromContextMenu(event: Event, appointment: Appointment) {
  clearHoldTimer()
  suppressClickId = appointment.id
  pressedAppointmentId.value = appointment.id
  actionEvent.value = event
  actionAppointment.value = appointment
}

function closeActionMenu() {
  actionAppointment.value = null
  actionEvent.value = undefined
  pressedAppointmentId.value = null
  suppressClickId = null
}

function selectAction(action: 'details' | 'edit' | 'delete') {
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

onBeforeUnmount(clearHoldTimer)
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
            :id="`schedule-appointment-${block.appointment.id}`"
            class="schedule-appointment"
            :class="{
              'schedule-appointment--group': block.isGroup,
              'schedule-appointment--compact': block.compact,
              'schedule-appointment--active':
                pressedAppointmentId === block.appointment.id ||
                actionAppointment?.id === block.appointment.id,
            }"
            :style="{
              top: `${block.top}px`,
              height: `${block.height}px`,
              left: `${LABEL_WIDTH + 10}px`,
              '--schedule-accent': block.accentColor || 'var(--se-separator)',
            }"
            :aria-label="`${block.clientName}, ${block.timeRange}`"
            @click="openAppointment(block.appointment)"
            @pointerdown="startAppointmentHold($event, block.appointment)"
            @pointermove="trackAppointmentHold"
            @pointerup="cancelAppointmentHold"
            @pointercancel="cancelAppointmentHold"
            @pointerleave="cancelAppointmentHold"
            @contextmenu.prevent="openActionsFromContextMenu($event, block.appointment)"
          >
            <span class="schedule-appointment__rail" aria-hidden="true" />

            <div v-if="block.compact" class="schedule-appointment__compact-row">
              <strong>{{ block.startLabel }}</strong>
              <span>{{ block.clientName }}</span>
              <ion-icon
                :icon="block.status.icon"
                :color="block.status.color"
                :aria-label="block.statusLabel"
                :title="block.statusLabel"
              />
            </div>

            <template v-else>
              <div class="schedule-appointment__time-row">
                <span>
                  <strong>{{ block.timeRange }}</strong>
                  <small>· {{ block.durationLabel }}</small>
                </span>
                <ion-icon
                  :icon="block.status.icon"
                  :color="block.status.color"
                  :aria-label="block.statusLabel"
                  :title="block.statusLabel"
                />
              </div>
              <p class="schedule-appointment__client">{{ block.clientName }}</p>

              <ul v-if="block.isGroup" class="schedule-appointment__services">
                <li v-for="service in block.services" :key="service.id">
                  <span :style="{ backgroundColor: service.color }" aria-hidden="true" />
                  <small>{{ service.name }}</small>
                </li>
              </ul>
              <p v-else class="schedule-appointment__meta">
                {{ block.serviceNames
                }}<template v-if="block.priceLabel"> · {{ block.priceLabel }}</template>
              </p>
              <p v-if="block.isGroup && block.priceLabel" class="schedule-appointment__price">
                {{ block.priceLabel }}
              </p>
            </template>
          </button>

          <article
            v-for="block in timeOffBlocks"
            :key="block.id"
            class="timed-time-off"
            :style="{
              top: `${block.top}px`,
              height: `${block.height}px`,
              left: `${LABEL_WIDTH + 10}px`,
            }"
          >
            <span class="timed-time-off__rail" aria-hidden="true" />
            <div>
              <ion-icon :icon="banOutline" color="medium" aria-hidden="true" />
              <strong>{{ block.timeRange }}</strong>
            </div>
            <p>{{ block.label }}</p>
          </article>

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

        <ion-popover
          class="schedule-action-popover"
          :is-open="Boolean(actionAppointment)"
          :event="actionEvent"
          reference="event"
          side="bottom"
          alignment="start"
          @did-dismiss="closeActionMenu"
        >
          <inset-list full-width>
            <ion-item button :detail="false" @click="selectAction('details')">
              <ion-icon slot="start" :icon="eyeOutline" color="medium" aria-hidden="true" />
              <ion-label>{{ t('home.schedule.details') }}</ion-label>
            </ion-item>
            <ion-item button :detail="false" @click="selectAction('edit')">
              <ion-icon slot="start" :icon="createOutline" color="medium" aria-hidden="true" />
              <ion-label>{{ t('common.edit') }}</ion-label>
            </ion-item>
            <ion-item button :detail="false" @click="selectAction('delete')">
              <ion-icon slot="start" :icon="trashOutline" color="danger" aria-hidden="true" />
              <ion-label color="danger">{{ t('common.delete') }}</ion-label>
            </ion-item>
          </inset-list>
        </ion-popover>
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
.schedule-empty p,
.schedule-appointment p,
.timed-time-off p {
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
  overflow: hidden;
  border-radius: 9px;
}

.schedule-appointment {
  z-index: 2;
  display: flex;
  width: auto;
  align-items: stretch;
  justify-content: flex-start;
  flex-direction: column;
  padding: 5px 10px 5px 12px;
  border: 0;
  background: var(--se-surface-card);
  background: color-mix(in srgb, var(--schedule-accent) 14%, var(--se-surface-card));
  color: var(--ion-text-color);
  font: inherit;
  text-align: start;
  touch-action: manipulation;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
  user-select: none;
  -webkit-touch-callout: none;
}

.schedule-appointment--group {
  border: 1px solid var(--se-separator);
  background: var(--se-surface-muted);
}

.schedule-appointment:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: -2px;
}

.schedule-appointment--active {
  z-index: 4;
  transform: scale(1.025);
  box-shadow: 0 8px 24px rgb(0 0 0 / 18%);
}

.schedule-appointment__rail,
.timed-time-off__rail {
  position: absolute;
  inset-block: 5px;
  inset-inline-start: 0;
  width: 4px;
  border-radius: 0 999px 999px 0;
}

.schedule-appointment__rail {
  background: var(--schedule-accent);
}

.schedule-appointment__compact-row,
.schedule-appointment__time-row,
.timed-time-off > div {
  display: flex;
  align-items: center;
}

.schedule-appointment__compact-row {
  min-width: 0;
  align-items: flex-start;
  gap: 7px;
}

.schedule-appointment__compact-row strong,
.schedule-appointment__compact-row span {
  overflow: hidden;
  font-size: 0.7rem;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-appointment__compact-row strong {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
}

.schedule-appointment__compact-row span {
  min-width: 0;
}

.schedule-appointment__compact-row ion-icon {
  margin-inline-start: auto;
  flex: 0 0 auto;
  font-size: 14px;
}

.schedule-appointment__time-row {
  justify-content: space-between;
  gap: 6px;
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}

.schedule-appointment__time-row span {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
}

.schedule-appointment__time-row small {
  color: var(--ion-color-medium);
  font-size: 0.62rem;
  white-space: nowrap;
}

.schedule-appointment__time-row ion-icon {
  flex: 0 0 auto;
  font-size: 15px;
}

.schedule-appointment__client {
  overflow: hidden;
  margin-top: 3px !important;
  font-size: 0.75rem;
  font-weight: 650;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-appointment__meta,
.schedule-appointment__price {
  overflow: hidden;
  margin-top: 2px !important;
  color: var(--ion-color-medium);
  font-size: 0.62rem;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-appointment__services {
  display: grid;
  gap: 2px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.schedule-appointment__services li {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.schedule-appointment__services li > span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  flex: 0 0 auto;
}

.schedule-appointment__services small {
  overflow: hidden;
  color: var(--ion-color-medium);
  font-size: 0.6rem;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timed-time-off {
  z-index: 1;
  padding: 7px 10px 5px 12px;
  border: 1px solid var(--se-separator);
  background: var(--se-surface-muted);
  color: var(--ion-text-color);
  pointer-events: none;
}

.timed-time-off__rail {
  background: var(--se-separator);
}

.timed-time-off > div {
  gap: 5px;
}

.timed-time-off ion-icon {
  font-size: 13px;
}

.timed-time-off strong {
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
}

.timed-time-off p {
  overflow: hidden;
  margin-top: 4px;
  color: var(--ion-color-medium);
  font-size: 0.65rem;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.schedule-action-popover {
  --width: 232px;
  --background: var(--se-surface-card, var(--ion-card-background, #fff));
  --box-shadow: 0 10px 32px rgb(0 0 0 / 24%);
}

.schedule-action-popover ion-item {
  font-size: 0.9rem;
}
</style>
