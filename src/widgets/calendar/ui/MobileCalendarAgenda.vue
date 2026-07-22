<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EventInput } from '@fullcalendar/core'
import type { Appointment } from '@entities/appointment'
import type { TimeBlock } from '@entities/time-block'
import { useFormats } from '@shared/lib/formats'

defineOptions({ name: 'MobileCalendarAgenda' })

const props = defineProps<{
  /** Wall-clock day ('YYYY-MM-DD') in the master's calendar timezone. */
  date: string
  events: EventInput[]
}>()

const emit = defineEmits<{
  'event-click': [appointment: Appointment]
  'time-block-click': [timeBlock: TimeBlock]
  create: []
}>()

const { t } = useI18n()
const formats = useFormats()

interface AgendaRow {
  key: string
  type: 'appointment' | 'time-block'
  startTime: string
  endTime: string
  allDay: boolean
  title: string
  subtitle?: string
  color: string
  statusIcon?: string
  appointment?: Appointment
  timeBlock?: TimeBlock
}

function toHHMM(value: unknown): string {
  if (typeof value !== 'string') return ''
  return /T(\d{2}:\d{2})/.exec(value)?.[1] ?? ''
}

// FullCalendar events carry wall-clock start/end strings already resolved to the
// master's calendar timezone (see buildCalendarEvents) — matching the date
// prefix is enough, no further timezone conversion needed.
const dayRows = computed<AgendaRow[]>(() => {
  const rows: AgendaRow[] = []

  for (const event of props.events) {
    const type = event.extendedProps?.type as 'appointment' | 'time-block' | undefined
    // Background/schedule events (breaks) carry no `type` — skip them here.
    if (!type) continue

    const startStr = typeof event.start === 'string' ? event.start : undefined
    if (!startStr || !startStr.startsWith(props.date)) continue

    if (type === 'appointment') {
      const appointment = event.extendedProps!.appointment as Appointment
      const serviceList = (event.extendedProps!.serviceList ?? []) as {
        name: string
        color: string
      }[]
      rows.push({
        key: `appt-${appointment.id}`,
        type,
        startTime: toHHMM(event.start),
        endTime: toHHMM(event.end),
        allDay: false,
        title: event.extendedProps!.clientName as string,
        subtitle: serviceList.map((s) => s.name).join(', ') || undefined,
        color: (event.borderColor as string | undefined) ?? '#a1a1aa',
        statusIcon: event.extendedProps!.statusIcon as string | undefined,
        appointment,
      })
    } else {
      const timeBlock = event.extendedProps!.timeBlock as TimeBlock
      rows.push({
        key: `block-${timeBlock.id}`,
        type,
        startTime: toHHMM(event.start),
        endTime: toHHMM(event.end),
        allDay: Boolean(event.allDay),
        title: (event.title as string | undefined) || t('timeBlocks.calendarTitle'),
        color: '#64748b',
        timeBlock,
      })
    }
  }

  return rows.sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
    return a.startTime.localeCompare(b.startTime)
  })
})

function onRowClick(row: AgendaRow) {
  if (row.type === 'appointment' && row.appointment) emit('event-click', row.appointment)
  else if (row.type === 'time-block' && row.timeBlock) emit('time-block-click', row.timeBlock)
}
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 py-3">
    <ol v-if="dayRows.length" class="space-y-2">
      <li
        v-for="row in dayRows"
        :key="row.key"
        role="button"
        tabindex="0"
        class="flex items-start gap-3 rounded-lg p-3 ring-1 ring-default bg-default transition-colors hover:bg-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
        @click="onRowClick(row)"
        @keydown.enter="onRowClick(row)"
        @keydown.space.prevent="onRowClick(row)"
      >
        <span
          class="w-1 self-stretch shrink-0 rounded-full"
          :style="{ backgroundColor: row.color }"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <span class="truncate text-sm font-semibold text-highlighted">{{ row.title }}</span>
            <UIcon
              v-if="row.statusIcon"
              :name="row.statusIcon"
              class="size-3.5 shrink-0 text-muted"
            />
          </div>
          <p v-if="row.subtitle" class="truncate text-xs text-muted">{{ row.subtitle }}</p>
          <p class="mt-0.5 text-xs font-medium text-muted">
            <template v-if="row.allDay">{{ t('calendar.allDay') }}</template>
            <template v-else>
              {{ formats.time(row.startTime) }} – {{ formats.time(row.endTime) }}
            </template>
          </p>
        </div>
      </li>
    </ol>

    <UEmpty
      v-else
      icon="i-lucide-calendar-plus"
      :title="t('calendar.empty.title')"
      :description="t('calendar.empty.description')"
      class="py-16"
    >
      <UButton leading-icon="i-lucide-plus" color="primary" class="mt-4" @click="emit('create')">
        {{ t('calendar.create.appointment') }}
      </UButton>
    </UEmpty>
  </div>
</template>
