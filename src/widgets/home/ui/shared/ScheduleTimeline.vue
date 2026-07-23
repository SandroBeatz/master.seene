<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  EFFECTIVE_APPOINTMENT_STATUS_VIEW,
  getAppointmentAccentColor,
  getEffectiveAppointmentStatus,
  isGroupAppointment,
  type Appointment,
} from '@entities/appointment'
import { useNowMinute } from '@shared/lib/now'
import { useMasterPreferencesStore } from '@entities/master'
import type { MasterScheduleDayKey } from '@entities/master'
import type { Client } from '@entities/client'
import type { Service } from '@entities/service'
import type { TimeBlock } from '@entities/time-block'
import { getCalendarDateTimeString } from '@shared/lib/time-zone'
import { useFormats } from '@shared/lib/formats'
import { Typography } from '@shared/ui'
import { buildTimelineLayout, type TimelineConstants } from '../../model/timeline-layout'
import { isVisibleScheduleAppointment } from '../../model/schedule-appointments'

const props = withDefaults(
  defineProps<{
    appointments: Appointment[]
    clients: Client[]
    services: Service[]
    timeBlocks?: TimeBlock[]
    loading: boolean
    selectedDate: Date
    embedded?: boolean
  }>(),
  {
    timeBlocks: () => [],
    embedded: false,
  },
)

const emit = defineEmits<{
  select: [appointment: Appointment]
  create: []
}>()

const { t } = useI18n()
const masterStore = useMasterPreferencesStore()
const formats = useFormats()
const now = useNowMinute()

/** Maps a Nuxt UI semantic color to a text utility for the status icon. */
const STATUS_TEXT_COLOR: Record<string, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  success: 'text-success',
  info: 'text-info',
  warning: 'text-warning',
  error: 'text-error',
  neutral: 'text-muted',
}

const serviceById = computed(() => new Map(props.services.map((s) => [s.id, s] as const)))

// Grid constants
const SLOT_HEIGHT = 65 // px per 1-hour slot (empty time / long appointments)
const SLOT_MIN = 60 // minutes per slot
const GRID_PT = 10 // top padding so first label doesn't clip
const LABEL_W = 40 // px reserved for time labels on the left
const BLOCK_GAP = 5 // px gap between adjacent appointment blocks
const MIN_CARD_H = 65 // px minimum visible height of an appointment card
const GAP_THRESHOLD_MIN = 60 // empty stretches longer than this collapse into "···"
const GAP_HEIGHT = 24 // px height of a collapsed gap
const BOTTOM_PAD = 12 // px padding below the last segment

const LAYOUT_CONSTANTS: TimelineConstants = {
  slotHeight: SLOT_HEIGHT,
  slotMin: SLOT_MIN,
  gridPaddingTop: GRID_PT,
  gapThresholdMin: GAP_THRESHOLD_MIN,
  gapHeight: GAP_HEIGHT,
  bottomPadding: BOTTOM_PAD,
  // Reserve room for the card plus the gap below it, so the derived card height
  // (topForMin(end) − topForMin(start) − BLOCK_GAP) never drops below MIN_CARD_H.
  minBlockHeight: MIN_CARD_H + BLOCK_GAP,
}

const timeZone = computed(() => masterStore.timeZone)

function minutesToLabel(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

function timeStringToMinutes(s: string): number {
  const parts = s.split(':').map(Number)
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
}

/** Minutes-from-midnight of an ISO timestamp in the master's timezone. */
function startMinInZone(startAt: string): number {
  // getCalendarDateTimeString → "YYYY-MM-DDTHH:MM:SS" wall-clock in `timeZone`.
  return timeStringToMinutes(getCalendarDateTimeString(startAt, timeZone.value).slice(11, 16))
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const isToday = computed(() => isSameDay(props.selectedDate, now.value))

const subtitleDate = computed(() =>
  new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long' }).format(props.selectedDate),
)

const visibleAppointments = computed(() => props.appointments.filter(isVisibleScheduleAppointment))

// Time off (time blocks): all-day ones show as a banner, timed ones as grey
// blocks inside the grid (fed into the layout so they position without overlap).
const partialTimeBlocks = computed(() => props.timeBlocks.filter((b) => !b.all_day))
const allDayTimeBlocks = computed(() => props.timeBlocks.filter((b) => b.all_day))

/** A time block as a same-day minute interval, clamped to [0, 1440]. */
function timeBlockInterval(block: TimeBlock): { from: number; to: number } {
  const from = Math.min(Math.max(startMinInZone(block.start_at), 0), 1440)
  let to = Math.min(Math.max(startMinInZone(block.end_at), 0), 1440)
  if (to <= from) to = 1440 // ends at/after midnight → run to the end of the day
  return { from, to }
}

function allDayTimeBlockLabel(block: TimeBlock): string {
  return block.notes || `${t('timeBlocks.calendarTitle')} · ${t('timeBlocks.form.allDay')}`
}

const hasTimedContent = computed(
  () => visibleAppointments.value.length > 0 || partialTimeBlocks.value.length > 0,
)
const hasAnyContent = computed(() => hasTimedContent.value || allDayTimeBlocks.value.length > 0)

// Working hours from master schedule for selectedDate
const workingHours = computed((): { start: number; end: number } | null => {
  const schedule = masterStore.preferences?.profile?.schedule
  if (!schedule?.days) return null
  const keys: MasterScheduleDayKey[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]
  const key = keys[props.selectedDate.getDay()]
  if (!key) return null
  const day = schedule.days[key]
  if (!day?.enabled || !day.start || !day.end) return null
  return { start: timeStringToMinutes(day.start), end: timeStringToMinutes(day.end) }
})

// "Now" in master-timezone minutes — today only (any time of day; the line is
// shown even outside working hours). Ticks with `now` so it advances live.
const nowMinutes = computed<number | null>(() => {
  if (!isToday.value) return null
  return timeStringToMinutes(getCalendarDateTimeString(now.value, timeZone.value).slice(11, 16))
})

// Segment-based layout: collapses long empty stretches into "···".
const layout = computed(() =>
  buildTimelineLayout({
    appointments: [
      ...visibleAppointments.value.map((a) => {
        const from = startMinInZone(a.start_at)
        return { from, to: from + a.duration }
      }),
      ...partialTimeBlocks.value.map(timeBlockInterval),
    ],
    workingHours: workingHours.value,
    nowMin: nowMinutes.value,
    constants: LAYOUT_CONSTANTS,
  }),
)

const totalHeight = computed(() => layout.value.totalHeight)

const gapSegments = computed(() =>
  layout.value.segments.filter((s): s is Extract<typeof s, { kind: 'gap' }> => s.kind === 'gap'),
)

// Horizontal guide lines + hour labels (only inside proportional ranges).
const timeSlots = computed(() =>
  layout.value.hourLabels.map((l) => ({ min: l.min, label: minutesToLabel(l.min), top: l.top })),
)

// Appointment blocks, positioned through the segment layout.
// Single service → service-colored card; group (2+) → neutral card with a
// dotted service list. Status is conveyed by icon, never by color.
const appointmentBlocks = computed(() => {
  const byId = serviceById.value
  return visibleAppointments.value.map((a) => {
    const client = props.clients.find((c) => c.id === a.client_id)
    const clientName = client
      ? [client.first_name, client.last_name].filter(Boolean).join(' ')
      : t('appointments.unknownClient')
    const serviceList = a.service_ids
      .map((id) => byId.get(id))
      .filter((s): s is Service => Boolean(s))
      .map((s) => ({ name: s.name, color: s.color }))
    const serviceNames = serviceList.map((s) => s.name).join(', ') || '—'

    const startMin = startMinInZone(a.start_at)
    const endMin = startMin + a.duration
    // Both top and height come from the same monotonic layout mapping, so cards
    // stay in sync with the grid and never overlap (each slot is ≥ MIN_CARD_H).
    const topStart = layout.value.topForMin(startMin) ?? 0
    const topEnd = layout.value.topForMin(endMin) ?? topStart
    const top = topStart + BLOCK_GAP / 2
    const height = Math.max(topEnd - topStart - BLOCK_GAP, MIN_CARD_H)
    const isGroup = isGroupAppointment(a)
    const accentColor = getAppointmentAccentColor(a, byId)
    const effectiveStatus = getEffectiveAppointmentStatus(a, now.value)
    const statusView = EFFECTIVE_APPOINTMENT_STATUS_VIEW[effectiveStatus]

    return {
      appointment: a,
      clientName,
      serviceList,
      serviceNames,
      isGroup,
      accentColor,
      // Left accent rail color: service accent for singles, neutral otherwise.
      barColor: accentColor ?? 'var(--ui-border)',
      statusIcon: statusView.icon,
      statusColorClass: STATUS_TEXT_COLOR[statusView.color as string] ?? 'text-muted',
      startLabel: formats.time(minutesToLabel(startMin)),
      timeRange: `${formats.time(minutesToLabel(startMin))}–${formats.time(minutesToLabel(endMin))}`,
      durationLabel: formats.duration(a.duration),
      priceLabel: a.price == null ? null : formats.price(a.price),
      compact: !isGroup && a.duration < 45,
      top,
      height,
    }
  })
})

// Timed time-off blocks — positioned through the same layout mapping as
// appointments, styled neutral/grey.
const timeBlockBlocks = computed(() =>
  partialTimeBlocks.value.map((b) => {
    const { from: startMin, to: endMin } = timeBlockInterval(b)
    const topStart = layout.value.topForMin(startMin) ?? 0
    const topEnd = layout.value.topForMin(endMin) ?? topStart
    return {
      id: b.id,
      top: topStart + BLOCK_GAP / 2,
      height: Math.max(topEnd - topStart - BLOCK_GAP, MIN_CARD_H),
      timeRange: `${formats.time(minutesToLabel(startMin))}–${formats.time(minutesToLabel(endMin))}`,
      label: b.notes || t('timeBlocks.calendarTitle'),
    }
  }),
)

// "Now" line — positioned via the layout ("now" is an anchor, so it always has
// a position). Shown only when the day has appointments. If it ever falls
// outside the positioned domain, pin it to the nearest edge (top / bottom).
const nowLine = computed((): { top: number; label: string } | null => {
  const m = nowMinutes.value
  if (m === null || !visibleAppointments.value.length) return null
  let top = layout.value.topForMin(m)
  if (top === null) {
    top = m < layout.value.domain.start ? GRID_PT : totalHeight.value - BOTTOM_PAD
  }
  return { top, label: formats.time(minutesToLabel(m)) }
})

// Nuxt UI overrides
const hostUI = {
  root: 'rounded-xl shadow-panel ring-0 divide-y-0',
  header: 'pb-0',
}

const resolvedHostUI = computed(() =>
  props.embedded
    ? {
        root: 'w-full min-w-0 max-w-full rounded-none bg-transparent! shadow-none ring-0 divide-y-0',
        body: 'min-w-0 p-0! sm:p-0!',
      }
    : hostUI,
)
</script>

<template>
  <UCard :ui="resolvedHostUI">
    <template v-if="!embedded" #header>
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <Typography variant="h5" class="text-highlighted font-bold">{{
            t('home.schedule.title')
          }}</Typography>
          <Typography variant="caption" class="text-muted">{{
            t('home.schedule.subtitle', { date: subtitleDate, n: visibleAppointments.length })
          }}</Typography>
        </div>
        <UButton
          color="neutral"
          variant="soft"
          size="sm"
          icon="i-lucide-plus"
          :aria-label="t('quickCreate.open')"
          @click="emit('create')"
        />
      </div>
    </template>

    <!-- Loading -->
    <div v-if="loading" class="space-y-2">
      <div
        v-for="i in 3"
        :key="i"
        class="h-16 w-full animate-pulse rounded-lg bg-elevated md:rounded-xl"
      />
    </div>

    <!-- Empty -->
    <UEmpty
      v-else-if="!hasAnyContent"
      variant="naked"
      icon="i-lucide-calendar-x"
      :description="t('home.upcoming.empty')"
      :ui="{ root: 'rounded-md border border-dashed border-default md:rounded-lg' }"
    />

    <template v-else>
      <!-- All-day time off banner(s) -->
      <div
        v-for="block in allDayTimeBlocks"
        :key="'ad-' + block.id"
        class="mb-2 flex items-center gap-2 rounded-md bg-elevated px-3 py-2 ring-1 ring-default"
      >
        <UIcon name="i-lucide-ban" class="size-4 shrink-0 text-muted" />
        <span class="min-w-0 truncate text-xs font-medium text-muted">{{
          allDayTimeBlockLabel(block)
        }}</span>
      </div>

      <!-- Time grid -->
      <div
        v-if="hasTimedContent"
        class="relative isolate overflow-hidden"
        :style="{ height: totalHeight + 'px' }"
      >
      <!-- Grid lines + time labels -->
      <template v-for="slot in timeSlots" :key="slot.min">
        <!-- Horizontal line -->
        <div
          class="absolute right-0 h-px"
          :style="{
            left: LABEL_W + 8 + 'px',
            top: slot.top + 'px',
            background: 'var(--ui-border)',
            opacity: 0.55,
          }"
        />
        <!-- Time label — centered on the line -->
        <span
          class="absolute text-[10px] tabular-nums leading-none select-none text-muted"
          :style="{
            top: slot.top + 'px',
            left: 0,
            width: LABEL_W + 'px',
            transform: 'translateY(-50%)',
          }"
          >{{ slot.label }}</span
        >
      </template>

      <!-- Collapsed empty stretches -->
      <div
        v-for="(gap, i) in gapSegments"
        :key="'gap-' + i"
        class="absolute flex items-center justify-center"
        :style="{
          top: gap.top + 'px',
          height: gap.height + 'px',
          left: LABEL_W + 8 + 'px',
          right: '0px',
        }"
      >
        <UIcon name="i-lucide-ellipsis-vertical" class="size-4 text-muted/50" />
      </div>

      <!-- Appointment blocks -->
      <div
        v-for="block in appointmentBlocks"
        :key="block.appointment.id"
        data-testid="appointment-block"
        class="appt-card absolute overflow-hidden rounded-md pr-2.5 pl-3 text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        :class="block.isGroup ? 'bg-elevated ring-1 ring-default' : ''"
        :style="{
          top: block.top + 'px',
          height: block.height + 'px',
          left: LABEL_W + 10 + 'px',
          right: '0px',
          paddingTop: '5px',
          paddingBottom: '5px',
          '--accent-bar': block.barColor,
          ...(block.isGroup || !block.accentColor
            ? {}
            : { backgroundColor: block.accentColor + '14' }),
        }"
        @click="emit('select', block.appointment)"
      >
        <!-- Compact single (very short appointment) -->
        <div v-if="block.compact" class="flex items-center gap-1.5">
          <span class="text-[11px] font-semibold tabular-nums shrink-0 leading-tight">{{
            block.startLabel
          }}</span>
          <span class="text-[11px] truncate leading-tight">{{ block.clientName }}</span>
          <UIcon :name="block.statusIcon" class="size-3 shrink-0 ml-auto" :class="block.statusColorClass" />
        </div>

        <!-- Full card -->
        <template v-else>
          <div class="flex items-center justify-between gap-1">
            <span class="flex min-w-0 items-center gap-1">
              <span class="text-[11px] font-semibold tabular-nums leading-tight">{{
                block.timeRange
              }}</span>
              <span class="text-[10px] tabular-nums leading-tight text-muted shrink-0"
                >· {{ block.durationLabel }}</span
              >
            </span>
            <UIcon :name="block.statusIcon" class="size-3.5 shrink-0" :class="block.statusColorClass" />
          </div>
          <p class="text-xs font-medium truncate leading-tight mt-0.5">{{ block.clientName }}</p>

          <!-- Group: services as a dotted list -->
          <ul v-if="block.isGroup" class="mt-1 space-y-0.5">
            <li v-for="(s, i) in block.serviceList" :key="i" class="flex items-center gap-1.5">
              <span class="size-2 rounded-full shrink-0" :style="{ backgroundColor: s.color }" />
              <span class="text-[10px] text-muted truncate leading-tight">{{ s.name }}</span>
            </li>
          </ul>
          <p
            v-if="block.isGroup && block.priceLabel"
            class="text-[10px] font-medium text-muted mt-1 leading-tight"
          >
            {{ block.priceLabel }}
          </p>

          <!-- Single: services + price on one line -->
          <p v-else class="text-[10px] text-muted truncate leading-tight mt-0.5">
            {{ block.serviceNames
            }}<template v-if="block.priceLabel"> · {{ block.priceLabel }}</template>
          </p>
        </template>
      </div>

      <!-- Time-off blocks (grey, neutral) -->
      <div
        v-for="block in timeBlockBlocks"
        :key="'tb-' + block.id"
        data-testid="time-off-block"
        class="appt-card absolute overflow-hidden rounded-md bg-elevated pr-2.5 pl-3 text-left ring-1 ring-default"
        :style="{
          top: block.top + 'px',
          height: block.height + 'px',
          left: LABEL_W + 10 + 'px',
          right: '0px',
          paddingTop: '5px',
          paddingBottom: '5px',
          '--accent-bar': 'var(--ui-border)',
        }"
      >
        <div class="flex items-center gap-1">
          <UIcon name="i-lucide-ban" class="size-3 shrink-0 text-muted" />
          <span class="text-[11px] font-semibold tabular-nums leading-tight text-muted">{{
            block.timeRange
          }}</span>
        </div>
        <p class="mt-0.5 truncate text-xs font-medium leading-tight text-muted">{{ block.label }}</p>
      </div>

      <!-- Now line — green, with the live time rendered as a chip on the line. -->
      <div
        v-if="nowLine"
        data-testid="now-line"
        class="absolute z-10 flex -translate-y-1/2 items-center gap-1 pointer-events-none"
        :style="{ top: nowLine.top + 'px', left: 0, right: 0 }"
      >
        <span
          class="shrink-0 rounded-full bg-success px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none text-white"
          >{{ nowLine.label }}</span
        >
        <div class="h-0.5 flex-1 rounded-full bg-success" />
      </div>
      </div>
    </template>
  </UCard>
</template>

<style scoped>
/* Left accent rail — a straight (non-rounded) bar, while the card keeps the
   design-system radius on its right corners. Color is passed via --accent-bar. */
.appt-card::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 4px;
  background: var(--accent-bar, var(--ui-border));
}
</style>
