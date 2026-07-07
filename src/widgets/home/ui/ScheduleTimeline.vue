<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  getAppointmentAccentColor,
  getAppointmentStatusIcon,
  isGroupAppointment,
  type Appointment,
} from '@entities/appointment'
import { useMasterPreferencesStore } from '@entities/master'
import type { MasterScheduleDayKey } from '@entities/master'
import type { Client } from '@entities/client'
import type { Service } from '@entities/service'
import { getCalendarDateTimeString } from '@shared/lib/time-zone'
import { useFormats } from '@shared/lib/formats'
import { Typography } from '@shared/ui'
import { buildTimelineLayout, type TimelineConstants } from '../model/timeline-layout'

const props = defineProps<{
  appointments: Appointment[]
  clients: Client[]
  services: Service[]
  loading: boolean
  selectedDate: Date
}>()

const emit = defineEmits<{
  select: [appointment: Appointment]
}>()

const { t } = useI18n()
const masterStore = useMasterPreferencesStore()
const formats = useFormats()

const serviceById = computed(() => new Map(props.services.map((s) => [s.id, s] as const)))

// Grid constants
const SLOT_HEIGHT = 52 // px per 1-hour slot
const SLOT_MIN = 60 // minutes per slot
const GRID_PT = 10 // top padding so first label doesn't clip
const LABEL_W = 40 // px reserved for time labels on the left
const BLOCK_GAP = 5 // px gap between adjacent appointment blocks
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

const isToday = computed(() => isSameDay(props.selectedDate, new Date()))

const subtitleDate = computed(() =>
  new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long' }).format(props.selectedDate),
)

const visibleAppointments = computed(() =>
  props.appointments.filter((a) => ['pending', 'confirmed', 'completed'].includes(a.status)),
)

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

// "Now" in master-timezone minutes — only today and within working hours.
const nowMinutes = computed<number | null>(() => {
  if (!isToday.value) return null
  const m = timeStringToMinutes(getCalendarDateTimeString(new Date(), timeZone.value).slice(11, 16))
  const wh = workingHours.value
  if (wh && (m < wh.start || m > wh.end)) return null
  return m
})

// Segment-based layout: collapses long empty stretches into "···".
const layout = computed(() =>
  buildTimelineLayout({
    appointments: visibleAppointments.value.map((a) => {
      const from = startMinInZone(a.start_at)
      return { from, to: from + a.duration }
    }),
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
    const top = (layout.value.topForMin(startMin) ?? 0) + BLOCK_GAP / 2
    const height = Math.max((a.duration / SLOT_MIN) * SLOT_HEIGHT, SLOT_HEIGHT * 0.8) - BLOCK_GAP
    const isGroup = isGroupAppointment(a)

    return {
      appointment: a,
      clientName,
      serviceList,
      serviceNames,
      isGroup,
      accentColor: getAppointmentAccentColor(a, byId),
      statusIcon: getAppointmentStatusIcon(a.status),
      startLabel: formats.time(minutesToLabel(startMin)),
      timeRange: `${formats.time(minutesToLabel(startMin))}–${formats.time(minutesToLabel(endMin))}`,
      priceLabel: a.price == null ? null : formats.price(a.price),
      compact: !isGroup && a.duration < 45,
      top,
      height,
    }
  })
})

// "Now" line — positioned via the layout (sits just below a collapsed gap).
const nowLine = computed((): { top: number; label: string } | null => {
  const m = nowMinutes.value
  if (m === null) return null
  const top = layout.value.topForMin(m)
  if (top === null) return null
  return { top, label: minutesToLabel(m) }
})

// Nuxt UI overrides
const hostUI = {
  root: 'rounded-xl shadow-panel ring-0 divide-y-0',
  header: 'pb-0',
}
</script>

<template>
  <UCard :ui="hostUI">
    <template #header>
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
          icon="i-lucide-ellipsis"
          :aria-label="t('home.schedule.options')"
        />
      </div>
    </template>

    <!-- Loading -->
    <div v-if="loading" class="space-y-2">
      <div v-for="i in 3" :key="i" class="h-14 w-full animate-pulse rounded-xl bg-elevated" />
    </div>

    <!-- Empty -->
    <UEmpty
      v-else-if="!visibleAppointments.length"
      variant="naked"
      icon="i-lucide-calendar-x"
      :description="t('home.upcoming.empty')"
      :ui="{ root: 'rounded-lg border border-dashed border-default' }"
    />

    <!-- Time grid -->
    <div v-else class="relative overflow-hidden" :style="{ height: totalHeight + 'px' }">
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
        class="absolute overflow-hidden rounded-md px-2.5 text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        :class="block.isGroup ? 'bg-elevated ring-1 ring-default' : 'border-l-4'"
        :style="{
          top: block.top + 'px',
          height: block.height + 'px',
          left: LABEL_W + 10 + 'px',
          right: '0px',
          paddingTop: '5px',
          paddingBottom: '5px',
          ...(block.isGroup
            ? {}
            : block.accentColor
              ? { borderLeftColor: block.accentColor, backgroundColor: block.accentColor + '14' }
              : { borderLeftColor: 'var(--ui-border)' }),
        }"
        @click="emit('select', block.appointment)"
      >
        <!-- Compact single (very short appointment) -->
        <div v-if="block.compact" class="flex items-center gap-1.5">
          <span class="text-[11px] font-semibold tabular-nums shrink-0 leading-tight">{{
            block.startLabel
          }}</span>
          <span class="text-[11px] truncate leading-tight">{{ block.clientName }}</span>
          <UIcon :name="block.statusIcon" class="size-3 text-muted shrink-0 ml-auto" />
        </div>

        <!-- Full card -->
        <template v-else>
          <div class="flex items-center justify-between gap-1">
            <span class="text-[11px] font-semibold tabular-nums leading-tight">{{
              block.timeRange
            }}</span>
            <UIcon :name="block.statusIcon" class="size-3.5 text-muted shrink-0" />
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

      <!-- Now line -->
      <div
        v-if="nowLine"
        class="absolute z-20 flex items-center pointer-events-none"
        :style="{ top: nowLine.top + 'px', left: 0, right: 0 }"
      >
        <span
          class="text-[10px] font-semibold tabular-nums text-primary leading-none shrink-0"
          :style="{ width: LABEL_W + 'px' }"
          >{{ nowLine.label }}</span
        >
        <div class="h-0.5 flex-1 bg-primary/70 rounded-full" />
        <div class="size-1.5 rounded-full bg-primary ml-1 shrink-0" />
      </div>
    </div>
  </UCard>
</template>
