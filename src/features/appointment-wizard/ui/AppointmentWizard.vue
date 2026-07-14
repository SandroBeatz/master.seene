<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDate, getLocalTimeZone, today, type DateValue } from '@internationalized/date'
import {
  collectDayBusyIntervals,
  timeBlockToBusyInterval,
  useAppointmentsQuery,
  useCreateAppointmentMutation,
  type CreateAppointmentDto,
} from '@entities/appointment'
import { useClientsQuery, type Client } from '@entities/client'
import {
  classifyDayState,
  resolveDayWindow,
  useMasterPreferencesStore,
  type DayState,
} from '@entities/master'
import { useServicesQuery, type Service } from '@entities/service'
import { useSessionStore } from '@entities/session'
import { useTimeBlocksQuery } from '@entities/time-block'
import { ClientFormDialog } from '@features/client-form'
import {
  buildDayTimeOptions,
  calendarDateToInput,
  findAvailableSlots,
  inputToCalendarDate,
  intervalsOverlap,
  minutesToTimeInput,
  type Interval,
} from '@shared/lib/scheduling'
import { getDateTimeInputValue, toUtcIsoFromZonedDateTime } from '@shared/lib/time-zone'
import { useFormats } from '@shared/lib/formats'
import { createAppointmentWizard, type WizardStep } from '../model/appointment-wizard'
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

// Per-day booking state for the calendar markers. Every day stays selectable —
// days-off and fully-booked days are shown, not disabled, so the master can
// still place a force-majeure booking on them via the manual time picker.
function dayStateFor(date: DateValue): DayState {
  const dateStr = calendarDateToInput(date)
  return classifyDayState({
    schedule: schedule.value,
    date: dateStr,
    busy: busyFor(dateStr),
    stepMinutes: stepMinutes.value,
    durationMinutes: totalDuration.value,
    nowMinutes: dateStr === todayStr ? nowMinutes : undefined,
  })
}

// Full-day time list for the always-available "set time manually" escape hatch,
// generated at the master's global slot interval (any time, any day).
const manualTimeOptions = computed(() =>
  buildDayTimeOptions({ stepMinutes: stepMinutes.value }).map((value) => ({
    value,
    label: formats.time(minutesToTimeInput(value)),
  })),
)

// Time offs touching the selected day, shown so the master sees why time is
// missing and can still book around/over them.
const selectedTimeOffs = computed(() => {
  if (!state.date) return []
  return (timeBlocks.value ?? []).flatMap((block) => {
    const interval = timeBlockToBusyInterval(block, state.date, timeZone.value)
    if (!interval) return []
    const [start, end] = interval
    const allDay = start === 0 && end === 24 * 60
    const label = allDay
      ? t('quickCreate.appointment.dateTime.allDay')
      : `${formats.time(minutesToTimeInput(start))} – ${formats.time(minutesToTimeInput(end))}`
    return [{ label, notes: block.notes }]
  })
})

// True when the chosen start (typically a manual pick) overlaps an existing
// booking/block — surfaced as a non-blocking warning, never a hard stop.
const hasConflict = computed(() => {
  if (state.slotMinutes == null || totalDuration.value <= 0) return false
  const candidate: Interval = [state.slotMinutes, state.slotMinutes + totalDuration.value]
  return busyFor(state.date).some((interval) => intervalsOverlap(candidate, interval))
})

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

// --- Footer summary ---
// Compact "h/min" duration used by the modal footer (e.g. "2h", "1h 15min").
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const h = t('quickCreate.appointment.footer.hoursUnit')
  const m = t('quickCreate.appointment.footer.minutesUnit')
  if (hours && mins) return `${hours}${h} ${mins}${m}`
  if (hours) return `${hours}${h}`
  return `${mins}${m}`
}

interface FooterStat {
  icon?: string
  label: string
  strong?: boolean
}

// Per-step summary chips shown on the left of the modal footer. Step 1 has no
// footer (client selection auto-advances), so it returns nothing.
const footerStats = computed<FooterStat[]>(() => {
  const stats: FooterStat[] = []
  const count = selectedServices.value.length

  if (state.step === 2) {
    stats.push({
      icon: 'i-lucide-layers',
      label: t('quickCreate.appointment.footer.services', count),
    })
    if (totalDuration.value > 0)
      stats.push({ icon: 'i-lucide-clock', label: formatDuration(totalDuration.value) })
    if (servicesTotalPrice.value != null)
      stats.push({ label: formats.price(servicesTotalPrice.value), strong: true })
  } else if (state.step === 3) {
    if (totalDuration.value > 0)
      stats.push({ icon: 'i-lucide-clock', label: formatDuration(totalDuration.value) })
    if (timeLabel.value) stats.push({ icon: 'i-lucide-calendar-clock', label: timeLabel.value })
  } else if (state.step === 4) {
    if (totalDuration.value > 0)
      stats.push({ icon: 'i-lucide-clock', label: formatDuration(totalDuration.value) })
    if (effectivePrice.value != null)
      stats.push({ label: formats.price(effectivePrice.value), strong: true })
  }

  return stats
})

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
  // A booking on a day that has already passed is created as confirmed (it
  // happened) — the master completes it via checkout, which records the sale.
  const isPastDay = Boolean(state.date) && state.date < todayStr
  const dto: CreateAppointmentDto = {
    client_id: state.clientId,
    service_ids: [...state.serviceIds],
    start_at: startAt,
    duration: totalDuration.value,
    price: effectivePrice.value,
    notes: state.notes || null,
    source: 'manual',
    status: isPastDay ? 'confirmed' : 'pending',
  }
  try {
    await createMutation.mutateAsync(dto)
    toast.add({ title: t('appointments.form.successCreate'), color: 'success' })
    emit('close')
  } catch {
    toast.add({ title: t('appointments.form.errorTitle'), color: 'error' })
  }
}

// Exposed to AppointmentWizardModal, which renders the chrome (header title +
// back navigation, stepper, footer summary + primary action) around the steps.
defineExpose({
  step: computed(() => state.step),
  stepTitle,
  clientName,
  footerStats,
  canAdvance: wizard.canAdvance,
  isLastStep: computed(() => state.step === 4),
  isCreating: createMutation.isLoading,
  next: () => wizard.next(),
  back: () => wizard.back(),
  goTo: (target: number) => wizard.goTo(target as WizardStep),
  submit: () => create(),
})
</script>

<template>
  <div>
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
      :day-state="dayStateFor"
      :manual-time-options="manualTimeOptions"
      :time-offs="selectedTimeOffs"
      :has-conflict="hasConflict"
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

    <ClientFormDialog
      :open="isClientFormOpen"
      mode="create"
      @update:open="isClientFormOpen = $event"
      @saved="onClientCreated"
    />
  </div>
</template>
