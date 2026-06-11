<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSessionStore } from '@entities/session'
import { useAppointmentsQuery, type Appointment } from '@entities/appointment'
import { useClientsQuery } from '@entities/client'
import { useServicesQuery } from '@entities/service'
import { useMasterPreferencesStore } from '@entities/master'
import { AppointmentPreviewPanel } from '@widgets/appointment-preview-panel'
import ScheduleCalendar from './ScheduleCalendar.vue'
import ScheduleTimeline from './ScheduleTimeline.vue'

const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const selectedDate = ref(new Date())
const previewOpen = ref(false)
const selectedAppointment = ref<Appointment | null>(null)

const dateRange = computed(() => {
  const d = selectedDate.value
  const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
  const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
})

const { data: appointments, isLoading } = useAppointmentsQuery(userId, dateRange)
const { data: clients } = useClientsQuery(userId)
const { data: services } = useServicesQuery(userId)

const selectedClient = computed(() =>
  clients.value?.find((c) => c.id === selectedAppointment.value?.client_id) ?? null,
)

const selectedServices = computed(() =>
  (selectedAppointment.value?.service_ids ?? [])
    .map((id) => services.value?.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s)),
)

function handleSelect(appointment: Appointment) {
  selectedAppointment.value = appointment
  previewOpen.value = true
}
</script>

<template>
  <div class="space-y-3">
    <ScheduleCalendar
      v-model="selectedDate"
      :user-id="userId"
      :time-zone="masterPreferencesStore.timeZone"
    />
    <ScheduleTimeline
      :appointments="appointments ?? []"
      :clients="clients ?? []"
      :services="services ?? []"
      :loading="isLoading"
      :selected-date="selectedDate"
      @select="handleSelect"
    />
  </div>

  <USlideover v-model:open="previewOpen" side="right">
    <template #content>
      <AppointmentPreviewPanel
        v-if="selectedAppointment"
        :appointment="selectedAppointment"
        :client="selectedClient"
        :services="selectedServices ?? []"
        :time-zone="masterPreferencesStore.timeZone"
        :time-format="masterPreferencesStore.timeFormat"
        @edit="previewOpen = false"
        @cancel="previewOpen = false"
        @confirm="previewOpen = false"
        @complete="previewOpen = false"
      />
    </template>
  </USlideover>
</template>
