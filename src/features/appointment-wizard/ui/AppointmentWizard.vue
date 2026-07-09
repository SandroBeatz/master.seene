<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDate, getLocalTimeZone, today, type DateValue } from '@internationalized/date'
import {
  collectDayBusyIntervals,
  useAppointmentsQuery,
  useCreateAppointmentMutation,
  type CreateAppointmentDto,
} from '@entities/appointment'
import { useClientsQuery, type Client } from '@entities/client'
import { resolveDayWindow, useMasterPreferencesStore } from '@entities/master'
import { useServicesQuery, type Service } from '@entities/service'
import { useSessionStore } from '@entities/session'
import { useTimeBlocksQuery } from '@entities/time-block'
import { ClientFormDialog } from '@features/client-form'
import {
  calendarDateToInput,
  findAvailableSlots,
  hasAnyFreeSlot,
  inputToCalendarDate,
  minutesToTimeInput,
} from '@shared/lib/scheduling'
import { getDateTimeInputValue, toUtcIsoFromZonedDateTime } from '@shared/lib/time-zone'
import { useFormats } from '@shared/lib/formats'
import { createAppointmentWizard } from '../model/appointment-wizard'
import type { AppointmentPrefill } from '../model/types'
import StepClient from './steps/StepClient.vue'
import StepServices from './steps/StepServices.vue'
import StepDateTime from './steps/StepDateTime.vue'
import StepConfirm from './steps/StepConfirm.vue'

const props = defineProps<{ prefill?: AppointmentPrefill }>()
const emit = defineEmits<{ close: [] }>()

const { t, locale } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
const formats = useFormats()

const userId = computed(() => sessionStore.session?.user.id ?? '')
const timeZone = computed(() => masterPreferencesStore.timeZone)
const stepMinutes = computed(() => masterPreferencesStore.calendarSlotStepMinutes)
const schedule = computed(() => masterPreferencesStore.preferences.profile?.schedule ?? null)
const zone = computed(() => (timeZone.value === 'local' ? getLocalTimeZone() : timeZone.value))

const wizard = createAppointmentWizard({ prefill: props.prefill, timeZone: timeZone.value })
const { state } = wizard

// "Now" in the master's timezone, resolved once for this short-lived dialog.
const nowInput = getDateTimeInputValue(new Date(), timeZone.value)
const todayStr = nowInput.date
const nowMinutes = nowInput.time
  ? Number(nowInput.time.slice(0, 2)) * 60 + Number(nowInput.time.slice(3, 5))
  : 0

// --- Data ---
const { data: clients } = useClientsQuery(userId)
const { data: services } = useServicesQuery(userId)

const initialMonth = inputToCalendarDate(state.date) ?? today(zone.value)
const visibleMonth = ref<CalendarDate>(new CalendarDate(initialMonth.year, initialMonth.month, 1))

const monthRange = computed(() => {
  const first = new CalendarDate(visibleMonth.value.year, visibleMonth.value.month, 1)
  const nextMonth = first.add({ months: 1 })
  return {
    from: toUtcIsoFromZonedDateTime(calendarDateToInput(first), '00:00', timeZone.value),
    to: toUtcIsoFromZonedDateTime(calendarDateToInput(nextMonth), '00:00', timeZone.value),
  }
})

const { data: appointments } = useAppointmentsQuery(userId, monthRange)
const { data: timeBlocks } = useTimeBlocksQuery(userId, monthRange)

// --- Derived selections ---
const selectedClient = computed(
  () => clients.value?.find((client) => client.id === state.clientId) ?? null,
)
const clientName = computed(() => {
  const client = selectedClient.value
  if (!client) return ''
  return [client.first_name, client.last_name].filter(Boolean).join(' ') || client.phone
})

const selectedServices = computed(() =>
  state.serviceIds
    .map((id) => services.value?.find((service) => service.id === id))
    .filter((service): service is Service => Boolean(service)),
)
const totalDuration = computed(() =>
  selectedServices.value.reduce((sum, service) => sum + service.duration, 0),
)
const servicesTotalPrice = computed(() =>
  selectedServices.value.length === 0
    ? null
    : selectedServices.value.reduce((sum, service) => sum + service.price, 0),
)
const effectivePrice = computed(() =>
  state.priceOverridden ? state.price : servicesTotalPrice.value,
)

// Keep the (non-overridden) price in sync with the selected services.
watch(
  () => state.serviceIds.slice(),
  () => {
    if (!state.priceOverridden) state.price = servicesTotalPrice.value
  },
)

// --- Availability ---
function busyFor(dateStr: string) {
  return collectDayBusyIntervals({
    appointments: appointments.value ?? [],
    timeBlocks: timeBlocks.value ?? [],
    date: dateStr,
    timeZone: timeZone.value,
  })
}

function earliestFor(dateStr: string, workStart: number) {
  return dateStr === todayStr ? Math.max(workStart, nowMinutes) : workStart
}

const slots = computed<number[]>(() => {
  if (!state.date || totalDuration.value <= 0) return []
  const window = resolveDayWindow(schedule.value, state.date)
  if (!window.enabled) return []
  return findAvailableSlots({
    workStart: window.workStart,
    workEnd: window.workEnd,
    breaks: window.breaks,
    busy: busyFor(state.date),
    stepMinutes: stepMinutes.value,
    durationMinutes: totalDuration.value,
    earliest: earliestFor(state.date, window.workStart),
  })
})

function isDateUnavailable(date: DateValue): boolean {
  if (totalDuration.value <= 0) return true
  const dateStr = calendarDateToInput(date)
  const window = resolveDayWindow(schedule.value, dateStr)
  if (!window.enabled) return true
  return !hasAnyFreeSlot({
    workStart: window.workStart,
    workEnd: window.workEnd,
    breaks: window.breaks,
    busy: busyFor(dateStr),
    stepMinutes: stepMinutes.value,
    durationMinutes: totalDuration.value,
    earliest: earliestFor(dateStr, window.workStart),
  })
}

const minDate = computed(() => today(zone.value))

function onDateChange(dateStr: string) {
  state.date = dateStr
  state.slotMinutes = null
}

// --- Confirm labels ---
const dateLabel = computed(() => {
  const date = inputToCalendarDate(state.date)
  if (!date) return ''
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(
    new Date(date.year, date.month - 1, date.day),
  )
})
const timeLabel = computed(() =>
  state.slotMinutes == null ? '' : formats.time(minutesToTimeInput(state.slotMinutes)),
)
const serviceNames = computed(() => selectedServices.value.map((service) => service.name))
const stepTitle = computed(() => {
  if (state.step === 1) return t('quickCreate.appointment.steps.client')
  if (state.step === 2) return t('quickCreate.appointment.steps.services')
  if (state.step === 3) return t('quickCreate.appointment.steps.dateTime')
  return t('quickCreate.appointment.steps.confirm')
})

// --- Stepper ---
const stepperItems = [{ value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }]

function onStepperNav(value: unknown) {
  if (typeof value === 'number') wizard.goTo(value as 1 | 2 | 3 | 4)
}

function onBack() {
  wizard.back()
}

function onClientSelect(clientId: string | null | undefined) {
  state.clientId = clientId ?? null
  if (clientId) wizard.next()
}

// --- Add client in-flow (auto-select + advance) ---
const isClientFormOpen = ref(false)

function onClientCreated(client?: Client) {
  if (!client) return
  state.clientId = client.id
  wizard.next()
}

// --- Create ---
const createMutation = useCreateAppointmentMutation(userId)

async function create() {
  if (state.slotMinutes == null || !state.clientId) return
  const startAt = toUtcIsoFromZonedDateTime(
    state.date,
    minutesToTimeInput(state.slotMinutes),
    timeZone.value,
  )
  const dto: CreateAppointmentDto = {
    client_id: state.clientId,
    service_ids: [...state.serviceIds],
    start_at: startAt,
    duration: totalDuration.value,
    price: effectivePrice.value,
    notes: state.notes || null,
    source: 'manual',
    status: 'pending',
  }
  try {
    await createMutation.mutateAsync(dto)
    toast.add({ title: t('appointments.form.successCreate'), color: 'success' })
    emit('close')
  } catch {
    toast.add({ title: t('appointments.form.errorTitle'), color: 'error' })
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-start gap-3">
      <UButton
        v-if="state.step > 1"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        square
        :aria-label="t('quickCreate.actions.back')"
        class="mt-0.5 shrink-0"
        @click="onBack"
      />
      <div class="min-w-0">
        <h2 class="text-lg font-semibold text-highlighted">
          {{ t('quickCreate.appointment.title') }}
        </h2>
        <p class="mt-0.5 text-sm text-muted">{{ stepTitle }}</p>
      </div>
    </div>

    <UStepper
      :items="stepperItems"
      value-key="value"
      :model-value="state.step"
      size="sm"
      @update:model-value="onStepperNav"
    />

    <StepClient
      v-if="state.step === 1"
      :model-value="state.clientId"
      :clients="clients ?? []"
      @update:model-value="onClientSelect"
      @add-client="isClientFormOpen = true"
    />

    <StepServices
      v-else-if="state.step === 2"
      v-model="state.serviceIds"
      :services="services ?? []"
      :total-duration="totalDuration"
      :total-price="servicesTotalPrice"
    />

    <StepDateTime
      v-else-if="state.step === 3"
      :date="state.date"
      :slot-minutes="state.slotMinutes"
      :slots="slots"
      :min-date="minDate"
      :is-date-unavailable="isDateUnavailable"
      @update:date="onDateChange"
      @update:slot-minutes="state.slotMinutes = $event"
      @update:month="visibleMonth = new CalendarDate($event.year, $event.month, 1)"
    />

    <StepConfirm
      v-else
      v-model:price="state.price"
      v-model:notes="state.notes"
      :client-name="clientName"
      :service-names="serviceNames"
      :date-label="dateLabel"
      :time-label="timeLabel"
      :duration-minutes="totalDuration"
      @price-input="state.priceOverridden = true"
    />

    <div v-if="state.step > 1" class="flex items-center justify-end gap-2">
      <UButton
        v-if="state.step < 4"
        color="primary"
        trailing-icon="i-lucide-arrow-right"
        :disabled="!wizard.canAdvance.value"
        @click="wizard.next()"
      >
        {{ t('quickCreate.appointment.next') }}
      </UButton>
      <UButton
        v-else
        color="primary"
        leading-icon="i-lucide-check"
        :loading="createMutation.isLoading.value"
        @click="create"
      >
        {{ t('quickCreate.appointment.create') }}
      </UButton>
    </div>

    <ClientFormDialog
      :open="isClientFormOpen"
      mode="create"
      @update:open="isClientFormOpen = $event"
      @saved="onClientCreated"
    />
  </div>
</template>
