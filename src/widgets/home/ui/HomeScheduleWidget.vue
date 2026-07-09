<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSessionStore } from '@entities/session'
import { useAppointmentsQuery, type Appointment } from '@entities/appointment'
import { useClientsQuery } from '@entities/client'
import { useServicesQuery } from '@entities/service'
import { useMasterPreferencesStore } from '@entities/master'
import { useQuickCreate } from '@widgets/quick-create-action'
import { useAppointmentPreview } from '@widgets/appointment-preview-panel'
import ScheduleCalendar from './ScheduleCalendar.vue'
import ScheduleTimeline from './ScheduleTimeline.vue'

const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
const preview = useAppointmentPreview()
const quickCreate = useQuickCreate()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const selectedDate = ref(new Date())

const dateRange = computed(() => {
  const d = selectedDate.value
  const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
  const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
})

const { data: appointments, isPending } = useAppointmentsQuery(userId, dateRange)
const { data: clients } = useClientsQuery(userId)
const { data: services } = useServicesQuery(userId)

function handleSelect(appointment: Appointment) {
  preview.open({ appointment })
}
</script>

<template>
  <div class="space-y-5 xl:sticky xl:top-6">
    <ScheduleCalendar
      v-model="selectedDate"
      :user-id="userId"
      :time-zone="masterPreferencesStore.timeZone"
    />
    <ScheduleTimeline
      :appointments="appointments ?? []"
      :clients="clients ?? []"
      :services="services ?? []"
      :loading="isPending"
      :selected-date="selectedDate"
      @select="handleSelect"
      @create="quickCreate.openMenu()"
    />
  </div>
</template>
