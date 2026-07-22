<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'
import type { Service } from '@entities/service'
import { useLocaleStore } from '@shared/lib/locale'
import { Typography } from '@shared/ui'
import { isVisibleScheduleAppointment } from '../../model/schedule-appointments'
import ScheduleCalendar from './ScheduleCalendar.vue'
import ScheduleTimeline from './ScheduleTimeline.vue'

const model = defineModel<Date>({ required: true })
const props = defineProps<{
  userId: string
  timeZone: string
  appointments: Appointment[]
  clients: Client[]
  services: Service[]
  loading: boolean
}>()

const emit = defineEmits<{
  select: [appointment: Appointment]
}>()

const { t } = useI18n()
const localeStore = useLocaleStore()
const leadingCalendarDate = ref(model.value)

const visibleAppointmentsCount = computed(
  () => props.appointments.filter(isVisibleScheduleAppointment).length,
)

const selectedDateLabel = computed(() =>
  new Intl.DateTimeFormat(localeStore.current, {
    month: 'long',
    day: 'numeric',
  }).format(model.value),
)

const monthYearLabel = computed(() =>
  new Intl.DateTimeFormat(localeStore.current, {
    month: 'long',
    year: 'numeric',
  }).format(leadingCalendarDate.value),
)

function handleVisibleDateChange(date: Date) {
  leadingCalendarDate.value = date
}

const summaryLabel = computed(() =>
  t('home.schedule.summary', {
    date: selectedDateLabel.value,
    n: visibleAppointmentsCount.value,
  }),
)

const hostUI = {
  root: 'w-full min-w-0 max-w-full overflow-hidden rounded-lg shadow-panel ring-0 divide-y-0',
  header: 'p-4 pb-3 sm:p-4 sm:pb-3',
  body: 'p-0 sm:p-0',
}
</script>

<template>
  <UCard :ui="hostUI">
    <template #header>
      <div class="flex min-w-0 items-start justify-between gap-3">
        <div class="min-w-0">
          <Typography variant="h5" class="text-highlighted font-bold">
            {{ t('home.schedule.title') }}
          </Typography>
          <Typography variant="caption" class="mt-0.5 text-muted">
            {{ monthYearLabel }}
          </Typography>
        </div>
        <Typography
          variant="caption"
          class="min-w-0 pt-0.5 text-right font-medium leading-tight text-muted"
        >
          {{ summaryLabel }}
        </Typography>
      </div>
    </template>

    <div class="min-w-0 px-4 pb-4">
      <ScheduleCalendar
        v-model="model"
        embedded
        :user-id="userId"
        :time-zone="timeZone"
        @visible-date-change="handleVisibleDateChange"
      />
    </div>

    <USeparator />

    <div class="min-w-0 p-4">
      <ScheduleTimeline
        embedded
        :appointments="appointments"
        :clients="clients"
        :services="services"
        :loading="loading"
        :selected-date="model"
        @select="emit('select', $event)"
      />
    </div>
  </UCard>
</template>
