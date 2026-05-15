<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@entities/session'
import { useAppointmentsQuery } from '@entities/appointment'
import { useClientsQuery } from '@entities/client'
import { useServicesQuery } from '@entities/service'
import WeekDayStrip from './WeekDayStrip.vue'
import AppointmentTimeline from './AppointmentTimeline.vue'

const { t } = useI18n()
const sessionStore = useSessionStore()
const userId = computed(() => sessionStore.session?.user.id ?? '')

const selectedDate = ref(new Date())

const dateRange = computed(() => {
  const d = selectedDate.value
  const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
  const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
})

const { data: appointments, isLoading } = useAppointmentsQuery(userId, dateRange)
const { data: clients } = useClientsQuery(userId)
const { data: services } = useServicesQuery(userId)
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm font-semibold uppercase text-muted">{{ t('home.upcoming.title') }}</p>
    <WeekDayStrip v-model="selectedDate" />
    <AppointmentTimeline
      :appointments="appointments ?? []"
      :clients="clients ?? []"
      :services="services ?? []"
      :loading="isLoading"
    />
  </div>
</template>
