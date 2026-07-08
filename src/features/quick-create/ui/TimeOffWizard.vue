<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDate, getLocalTimeZone, today, type DateValue } from '@internationalized/date'
import { useAppointmentsQuery } from '@entities/appointment'
import { useMasterPreferencesStore } from '@entities/master'
import { useSessionStore } from '@entities/session'
import {
  useCreateTimeBlockMutation,
  useTimeBlocksQuery,
  type CreateTimeBlockDto,
} from '@entities/time-block'
import { findFreeIntervals, intervalsOverlap, type Interval } from '@shared/lib/scheduling'
import { addDateInputDays, toUtcIsoFromZonedDateTime } from '@shared/lib/time-zone'
import { useFormats } from '@shared/lib/formats'
import { collectDayBusyIntervals } from '../model/busy-intervals'
import { resolveDayWindow } from '../model/resolve-day-window'
import {
  calendarDateToInput,
  inputToCalendarDate,
  minutesToTimeInput,
  timeInputToMinutes,
} from '../lib/calendar-date'
import type { TimeOffPrefill } from '../model/types'

const props = defineProps<{ prefill?: TimeOffPrefill }>()
const emit = defineEmits<{ back: []; close: [] }>()

const { t } = useI18n()
const toast = useToast()
const sessionStore = useSessionStore()
const masterPreferencesStore = useMasterPreferencesStore()
const formats = useFormats()

const userId = computed(() => sessionStore.session?.user.id ?? '')
const timeZone = computed(() => masterPreferencesStore.timeZone)
const schedule = computed(() => masterPreferencesStore.preferences.profile?.schedule ?? null)
const zone = computed(() => (timeZone.value === 'local' ? getLocalTimeZone() : timeZone.value))

const state = reactive({
  date: props.prefill?.date ?? '',
  allDay: false,
  startTime: props.prefill?.startTime ?? '',
  endTime: '',
  notes: '',
})

const initialMonth = inputToCalendarDate(state.date) ?? today(zone.value)
const visibleMonth = ref<CalendarDate>(new CalendarDate(initialMonth.year, initialMonth.month, 1))
const minDate = computed(() => today(zone.value))

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

// --- Day analysis ---
const window = computed(() => resolveDayWindow(schedule.value, state.date))

const dayBusy = computed<Interval[]>(() =>
  state.date
    ? collectDayBusyIntervals({
        appointments: appointments.value ?? [],
        timeBlocks: timeBlocks.value ?? [],
        date: state.date,
        timeZone: timeZone.value,
      })
    : [],
)

const freeIntervals = computed<Interval[]>(() =>
  state.date && window.value.enabled
    ? findFreeIntervals({
        workStart: window.value.workStart,
        workEnd: window.value.workEnd,
        breaks: window.value.breaks,
        busy: dayBusy.value,
      })
    : [],
)

/** null = no date yet; A = free day; B = has appointments + gaps; C = fully busy. */
const branch = computed<'A' | 'B' | 'C' | null>(() => {
  if (!state.date) return null
  if (dayBusy.value.length === 0) return 'A'
  return freeIntervals.value.length > 0 ? 'B' : 'C'
})

// --- Selected range validation ---
const selectedRange = computed<Interval | null>(() => {
  if (!state.startTime || !state.endTime) return null
  return [timeInputToMinutes(state.startTime), timeInputToMinutes(state.endTime)]
})

const rangeOverlapsBusy = computed(
  () =>
    selectedRange.value != null &&
    dayBusy.value.some((busy) => intervalsOverlap(selectedRange.value as Interval, busy)),
)

const isRangeValid = computed(() => {
  const range = selectedRange.value
  return range != null && range[1] > range[0]
})

const canCreate = computed(() => {
  if (branch.value === 'A') return state.allDay || isRangeValid.value
  if (branch.value === 'B') return isRangeValid.value && !rangeOverlapsBusy.value
  return false
})

function intervalLabel(interval: Interval): string {
  return `${formats.time(minutesToTimeInput(interval[0]))} – ${formats.time(minutesToTimeInput(interval[1]))}`
}

function pickInterval(interval: Interval) {
  state.allDay = false
  state.startTime = minutesToTimeInput(interval[0])
  state.endTime = minutesToTimeInput(interval[1])
}

function onDateChange(value: CalendarDate) {
  state.date = calendarDateToInput(value)
  state.allDay = false
  state.startTime = ''
  state.endTime = ''
}

function onMonthChange(value: DateValue | undefined) {
  if (!value) return
  visibleMonth.value = new CalendarDate(value.year, value.month, 1)
}

// --- Create ---
const createMutation = useCreateTimeBlockMutation(userId)

function buildRange(): { startAt: string; endAt: string } | null {
  const tz = timeZone.value
  if (state.allDay) {
    return {
      startAt: toUtcIsoFromZonedDateTime(state.date, '00:00', tz),
      endAt: toUtcIsoFromZonedDateTime(addDateInputDays(state.date, 1), '00:00', tz),
    }
  }
  const startAt = toUtcIsoFromZonedDateTime(state.date, state.startTime, tz)
  const endAt = toUtcIsoFromZonedDateTime(state.date, state.endTime, tz)
  if (!(new Date(endAt) > new Date(startAt))) return null
  return { startAt, endAt }
}

async function create() {
  const range = buildRange()
  if (!range) {
    toast.add({ title: t('timeBlocks.validation.rangeInvalid'), color: 'error' })
    return
  }
  const dto: CreateTimeBlockDto = {
    start_at: range.startAt,
    end_at: range.endAt,
    all_day: state.allDay,
    notes: state.notes || null,
  }
  try {
    await createMutation.mutateAsync(dto)
    toast.add({ title: t('timeBlocks.form.successCreate'), color: 'success' })
    emit('close')
  } catch {
    toast.add({ title: t('timeBlocks.form.errorTitle'), color: 'error' })
  }
}

const calendarValue = computed(() => inputToCalendarDate(state.date) ?? undefined)
</script>

<template>
  <div class="space-y-5">
    <UCalendar
      :model-value="calendarValue"
      :min-value="minDate"
      class="mx-auto"
      @update:model-value="onDateChange($event as CalendarDate)"
      @update:placeholder="onMonthChange"
    />

    <p v-if="branch === null" class="text-sm text-muted">
      {{ t('quickCreate.timeOff.pickDate') }}
    </p>

    <!-- Branch C: no free time -->
    <UAlert
      v-else-if="branch === 'C'"
      color="warning"
      variant="soft"
      icon="i-lucide-calendar-x"
      :title="t('quickCreate.timeOff.noFreeTime')"
    />

    <template v-else>
      <!-- Branch B: warning + free intervals -->
      <template v-if="branch === 'B'">
        <UAlert
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          :description="t('quickCreate.timeOff.hasAppointments')"
        />
        <div>
          <p class="mb-2 text-sm font-medium text-highlighted">
            {{ t('quickCreate.timeOff.freeTitle') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="interval in freeIntervals"
              :key="`${interval[0]}-${interval[1]}`"
              size="sm"
              color="neutral"
              variant="soft"
              @click="pickInterval(interval)"
            >
              {{ intervalLabel(interval) }}
            </UButton>
          </div>
        </div>
      </template>

      <!-- Branch A: all-day toggle -->
      <USwitch v-if="branch === 'A'" v-model="state.allDay" :label="t('timeBlocks.form.allDay')" />

      <!-- From / To (hidden when all-day) -->
      <div v-if="!(branch === 'A' && state.allDay)" class="grid grid-cols-2 gap-3">
        <UFormField :label="t('timeBlocks.form.startTime')">
          <UInput v-model="state.startTime" type="time" class="w-full" />
        </UFormField>
        <UFormField :label="t('timeBlocks.form.endTime')">
          <UInput v-model="state.endTime" type="time" class="w-full" />
        </UFormField>
      </div>

      <p v-if="rangeOverlapsBusy" class="text-sm text-error">
        {{ t('quickCreate.timeOff.overlap') }}
      </p>

      <UFormField :label="t('timeBlocks.form.notes')">
        <UTextarea
          v-model="state.notes"
          :rows="2"
          :placeholder="t('timeBlocks.form.notesPlaceholder')"
          class="w-full"
        />
      </UFormField>
    </template>

    <div class="flex items-center justify-between gap-2">
      <UButton
        color="neutral"
        variant="ghost"
        leading-icon="i-lucide-arrow-left"
        @click="emit('back')"
      >
        {{ t('quickCreate.actions.back') }}
      </UButton>
      <UButton
        color="primary"
        leading-icon="i-lucide-check"
        :disabled="!canCreate"
        :loading="createMutation.isLoading.value"
        @click="create"
      >
        {{ t('quickCreate.timeOff.create') }}
      </UButton>
    </div>
  </div>
</template>
