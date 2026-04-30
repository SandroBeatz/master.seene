<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { EventInput } from '@fullcalendar/core'
import type { Appointment, AppointmentDateRange } from '@entities/appointment'
import { useAppointmentsQuery } from '@entities/appointment'
import { useClientsQuery } from '@entities/client'
import { useSessionStore } from '@entities/session'
import { useServicesQuery } from '@entities/service'
import { AppointmentFormDialog } from '@features/appointment-form'
import { CalendarWidget } from '@widgets/calendar'

const { t } = useI18n()
const sessionStore = useSessionStore()

const userId = computed(() => sessionStore.session?.user.id ?? '')

// --- Date range (updated by FullCalendar datesSet) ---
const now = new Date()
const dateRange = ref<AppointmentDateRange>({
  from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
  to: new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString(),
})

function onDatesSet(range: { from: string; to: string }) {
  dateRange.value = { from: range.from, to: range.to }
}

// --- Data ---
const { data: appointments } = useAppointmentsQuery(userId, dateRange)
const { data: clients } = useClientsQuery(userId)
const { data: services } = useServicesQuery(userId)

// Lookup maps for names
const clientMap = computed(() => {
  const map = new Map<string, string>()
  for (const c of clients.value ?? []) {
    map.set(c.id, [c.first_name, c.last_name].filter(Boolean).join(' '))
  }
  return map
})

const serviceMap = computed(() => {
  const map = new Map<string, { name: string; color: string }>()
  for (const s of services.value ?? []) {
    map.set(s.id, { name: s.name, color: s.color })
  }
  return map
})

const STATUS_COLORS: Record<string, { borderColor: string; backgroundColor: string }> = {
  pending:   { borderColor: '#f97316', backgroundColor: '#fff7ed' },
  completed: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
  cancelled: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  no_show:   { borderColor: '#94a3b8', backgroundColor: '#f8fafc' },
}

function getEventColors(appt: Appointment) {
  if (appt.status === 'confirmed') {
    const service = appt.service_ids[0] ? serviceMap.value.get(appt.service_ids[0]) : undefined
    const color = service?.color ?? '#a78bfa'
    return { borderColor: color, backgroundColor: color + '33', textColor: '#1e293b' }
  }
  const colors = STATUS_COLORS[appt.status] ?? { borderColor: '#94a3b8', backgroundColor: '#f8fafc' }
  return { ...colors, textColor: '#1e293b' }
}

// Map appointments → FullCalendar EventInput
const calendarEvents = computed<EventInput[]>(() =>
  (appointments.value ?? []).map((appt) => {
    const clientName = clientMap.value.get(appt.client_id) ?? t('appointments.unknownClient')
    const serviceNames = appt.service_ids
      .map((id) => serviceMap.value.get(id)?.name)
      .filter(Boolean)
      .join(', ')

    const startMs = new Date(appt.start_at).getTime()
    const endMs = startMs + appt.duration * 60 * 1000
    const { borderColor, backgroundColor, textColor } = getEventColors(appt)

    return {
      id: appt.id,
      start: appt.start_at,
      end: new Date(endMs).toISOString(),
      title: serviceNames ? `${clientName} — ${serviceNames}` : clientName,
      borderColor,
      backgroundColor,
      textColor,
      extendedProps: { appointment: appt },
    }
  }),
)

// --- Form state ---
const isFormOpen = ref(false)
const selectedStartAt = ref<string | undefined>(undefined)
const selectedAppointment = ref<Appointment | undefined>(undefined)

function onSlotClick(dateStr: string) {
  selectedAppointment.value = undefined
  selectedStartAt.value = dateStr
  isFormOpen.value = true
}

function onEventClick(appointment: Appointment) {
  selectedStartAt.value = undefined
  selectedAppointment.value = appointment
  isFormOpen.value = true
}
</script>

<template>
  <UTheme
    :ui="{
      page: { root: 'px-12 py-3 w-full max-w-7xl mx-auto' },
      pageHeader: { root: 'border-none pb-2' },
    }"
  >
    <UPage as="main">
      <UPageHeader :title="t('calendar.title')" :description="t('calendar.description')" />
      <UPageBody>
        <UPageCard>
          <div class="min-h-[700px]">
            <CalendarWidget
              :events="calendarEvents"
              @slot-click="onSlotClick"
              @event-click="onEventClick"
              @dates-set="onDatesSet"
            />
          </div>
        </UPageCard>
      </UPageBody>
    </UPage>
  </UTheme>

  <AppointmentFormDialog
    :open="isFormOpen"
    :initial-start-at="selectedStartAt"
    :appointment="selectedAppointment"
    @update:open="isFormOpen = $event"
    @saved="isFormOpen = false"
  />
</template>
