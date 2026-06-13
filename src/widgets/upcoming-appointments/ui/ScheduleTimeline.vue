<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { APPOINTMENT_STATUS_VIEW, type Appointment } from '@entities/appointment'
import { useMasterPreferencesStore } from '@entities/master'
import type { MasterScheduleDayKey } from '@entities/master'
import type { Client } from '@entities/client'
import type { Service } from '@entities/service'
import { Typography } from '@shared/ui'

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

// Grid constants
const SLOT_HEIGHT = 52 // px per 1-hour slot
const SLOT_MIN = 60 // minutes per slot
const GRID_PT = 10 // top padding so first label doesn't clip
const LABEL_W = 40 // px reserved for time labels on the left
const BLOCK_GAP = 5 // px gap between adjacent appointment blocks

function minutesToLabel(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

function timeStringToMinutes(s: string): number {
  const parts = s.split(':').map(Number)
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
}

function dateToMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

function floor30(m: number): number {
  return Math.floor(m / 60) * 60
}
function ceil30(m: number): number {
  return Math.ceil(m / 60) * 60
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

// Visible grid range in minutes-from-midnight
const gridRange = computed((): { start: number; end: number } | null => {
  const items = visibleAppointments.value
  if (!items.length) return null

  let minStart = Infinity,
    maxEnd = -Infinity
  for (const a of items) {
    const s = dateToMinutes(new Date(a.start_at))
    const e = s + a.duration
    if (s < minStart) minStart = s
    if (e > maxEnd) maxEnd = e
  }

  let gStart = floor30(minStart)
  let gEnd = ceil30(maxEnd)

  // Extend to include "now" only if today and within working hours (or no schedule configured)
  if (isToday.value) {
    const nowMin = dateToMinutes(new Date())
    const wh = workingHours.value
    const inWorkHours = !wh || (nowMin >= wh.start && nowMin <= wh.end)
    if (inWorkHours) {
      if (nowMin < gStart) gStart = floor30(nowMin)
      if (nowMin > gEnd) gEnd = ceil30(nowMin)
    }
  }

  return { start: gStart, end: gEnd }
})

// Total rendered height in px
const totalHeight = computed(() => {
  if (!gridRange.value) return 0
  const slots = (gridRange.value.end - gridRange.value.start) / SLOT_MIN
  return GRID_PT + slots * SLOT_HEIGHT + 12
})

// Compute top for a minute value within the grid
function topForMin(min: number): number {
  return GRID_PT + ((min - (gridRange.value?.start ?? 0)) / SLOT_MIN) * SLOT_HEIGHT
}

// Horizontal guide lines + time labels
const timeSlots = computed(() => {
  const range = gridRange.value
  if (!range) return []
  const out = []
  for (let m = range.start; m <= range.end; m += SLOT_MIN) {
    out.push({ min: m, label: minutesToLabel(m), top: topForMin(m) })
  }
  return out
})

// Appointment blocks
const appointmentBlocks = computed(() => {
  const range = gridRange.value
  if (!range) return []

  return visibleAppointments.value.map((a) => {
    const client = props.clients.find((c) => c.id === a.client_id)
    const clientName = client
      ? [client.first_name, client.last_name].filter(Boolean).join(' ')
      : t('appointments.unknownClient')
    const serviceNames =
      a.service_ids
        .map((id) => props.services.find((s) => s.id === id)?.name)
        .filter((n): n is string => Boolean(n))
        .join(', ') || '—'
    const startMin = dateToMinutes(new Date(a.start_at))
    const top = topForMin(startMin) + BLOCK_GAP / 2
    const height = Math.max((a.duration / SLOT_MIN) * SLOT_HEIGHT, SLOT_HEIGHT * 0.8) - BLOCK_GAP
    const time = minutesToLabel(startMin)
    return { appointment: a, clientName, serviceNames, time, top, height }
  })
})

// "Now" line — only within grid range AND within working hours
const nowLine = computed((): { top: number; label: string } | null => {
  if (!isToday.value || !gridRange.value) return null
  const nowMin = dateToMinutes(new Date())
  const wh = workingHours.value
  if (wh && (nowMin < wh.start || nowMin > wh.end)) return null
  const { start, end } = gridRange.value
  if (nowMin < start || nowMin > end) return null
  return { top: topForMin(nowMin), label: minutesToLabel(nowMin) }
})

function statusStyle(appointment: Appointment): Record<string, string> {
  const cfg = APPOINTMENT_STATUS_VIEW[appointment.status]?.calendar
  if (!cfg) return {}
  return { borderLeftColor: cfg.borderColor, backgroundColor: cfg.backgroundColor }
}

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

      <!-- Appointment blocks -->
      <div
        v-for="block in appointmentBlocks"
        :key="block.appointment.id"
        class="absolute overflow-hidden rounded-sm border-l-4 px-3 text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        :style="{
          top: block.top + 'px',
          height: block.height + 'px',
          left: LABEL_W + 10 + 'px',
          right: '0px',
          paddingTop: '5px',
          paddingBottom: '5px',
          ...statusStyle(block.appointment),
        }"
        @click="emit('select', block.appointment)"
      >
        <div class="flex items-baseline justify-between gap-1">
          <span class="text-xs font-semibold truncate leading-tight">{{ block.clientName }}</span>
          <span class="text-[10px] tabular-nums text-muted/80 shrink-0 leading-tight">{{
            block.time
          }}</span>
        </div>
        <p
          class="text-[10px] text-muted truncate leading-tight mt-0.5"
        >
          {{ block.serviceNames }}
        </p>
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
