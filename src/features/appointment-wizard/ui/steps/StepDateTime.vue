<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CalendarDate, type DateValue } from '@internationalized/date'
import type { DayState } from '@entities/master'
import { useFormats } from '@shared/lib/formats'
import {
  calendarDateToInput,
  groupSlotsByPartOfDay,
  inputToCalendarDate,
  minutesToTimeInput,
  type PartOfDay,
} from '@shared/lib/scheduling'

const props = defineProps<{
  /** Selected day, `YYYY-MM-DD`, or '' when none chosen yet. */
  date: string
  slotMinutes: number | null
  slots: number[]
  /** Today in the master's timezone — the boundary between past and future days. */
  minDate: CalendarDate
  /** Booking state of a calendar day — drives the day markers and empty state. */
  dayState: (date: DateValue) => DayState
  /** Full-day time list for the manual picker, at the global slot interval. */
  manualTimeOptions: { value: number; label: string }[]
  /** Time offs (breaks / blocks) touching the selected day. */
  timeOffs: { label: string; notes: string | null }[]
  /** Whether the chosen start overlaps an existing booking (non-blocking). */
  hasConflict: boolean
}>()

const emit = defineEmits<{
  'update:date': [string]
  'update:slotMinutes': [number]
  'update:month': [CalendarDate]
}>()

const { t } = useI18n()
const formats = useFormats()

const calendarValue = computed(() => inputToCalendarDate(props.date) ?? undefined)
const hasDate = computed(() => Boolean(props.date))
const minDateStr = computed(() => calendarDateToInput(props.minDate))
const isPastSelected = computed(() => Boolean(props.date) && props.date < minDateStr.value)

// Whether the manual time picker is expanded. Available at all times (force
// majeure), and reset back to the slot list whenever the day changes.
const isManual = ref(false)
watch(
  () => props.date,
  () => {
    isManual.value = false
  },
)

// --- Calendar day markers ---
const MARKER_CLASS: Record<DayState, string> = {
  available: 'bg-primary',
  full: 'bg-warning',
  'day-off': 'border border-muted',
}

function isPast(day: DateValue): boolean {
  return calendarDateToInput(day) < minDateStr.value
}

// No marker on past days — they read as dimmed, uncluttered.
function markerClass(day: DateValue): string {
  if (isPast(day)) return ''
  return MARKER_CLASS[props.dayState(day)]
}

// --- Slot groups (morning / afternoon / evening) ---
const GROUP_META: Record<PartOfDay, { labelKey: string; icon: string }> = {
  morning: {
    labelKey: 'quickCreate.appointment.dateTime.groups.morning',
    icon: 'i-lucide-sunrise',
  },
  day: { labelKey: 'quickCreate.appointment.dateTime.groups.day', icon: 'i-lucide-sun' },
  evening: { labelKey: 'quickCreate.appointment.dateTime.groups.evening', icon: 'i-lucide-sunset' },
}

const slotGroups = computed(() =>
  groupSlotsByPartOfDay(props.slots).map((group) => ({ ...group, ...GROUP_META[group.part] })),
)

// --- Empty state (day off / fully booked) ---
const selectedDayState = computed<DayState | null>(() =>
  calendarValue.value ? props.dayState(calendarValue.value) : null,
)
const emptyIcon = computed(() =>
  selectedDayState.value === 'day-off' ? 'i-lucide-coffee' : 'i-lucide-calendar-x',
)
const emptyMessage = computed(() =>
  selectedDayState.value === 'day-off'
    ? t('quickCreate.appointment.dateTime.dayOff')
    : t('quickCreate.appointment.dateTime.noSlots'),
)

function onDateChange(value: CalendarDate) {
  emit('update:date', calendarDateToInput(value))
}

function onSlotSelect(minutes: number) {
  isManual.value = false
  emit('update:slotMinutes', minutes)
}

function slotLabel(minutes: number): string {
  return formats.time(minutesToTimeInput(minutes))
}
</script>

<template>
  <div class="space-y-4">
    <UCalendar
      :model-value="calendarValue"
      :year-controls="false"
      class="mx-auto"
      @update:model-value="onDateChange($event as CalendarDate)"
      @update:placeholder="emit('update:month', $event as CalendarDate)"
    >
      <template #day="{ day }">
        <span
          class="relative flex size-full items-center justify-center"
          :class="{ 'text-dimmed': isPast(day) }"
        >
          {{ day.day }}
          <span
            v-if="markerClass(day)"
            :class="markerClass(day)"
            class="absolute -bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full"
          />
        </span>
      </template>
    </UCalendar>

    <div class="flex items-center justify-center gap-4 text-xs text-muted">
      <span class="flex items-center gap-1.5">
        <span class="size-1.5 rounded-full bg-primary" aria-hidden="true" />
        {{ t('quickCreate.appointment.dateTime.legend.available') }}
      </span>
      <span class="flex items-center gap-1.5">
        <span class="size-1.5 rounded-full bg-warning" aria-hidden="true" />
        {{ t('quickCreate.appointment.dateTime.legend.full') }}
      </span>
      <span class="flex items-center gap-1.5">
        <span class="size-1.5 rounded-full border border-muted" aria-hidden="true" />
        {{ t('quickCreate.appointment.dateTime.legend.dayOff') }}
      </span>
    </div>

    <template v-if="hasDate">
      <div v-if="timeOffs.length" class="space-y-1.5 rounded-lg border border-default p-3">
        <p class="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted uppercase">
          <UIcon name="i-lucide-ban" class="size-3.5" />
          {{ t('quickCreate.appointment.dateTime.timeOff') }}
        </p>
        <ul class="space-y-1">
          <li
            v-for="(off, index) in timeOffs"
            :key="index"
            class="flex items-baseline gap-2 text-sm"
          >
            <span class="font-medium text-highlighted">{{ off.label }}</span>
            <span v-if="off.notes" class="truncate text-muted">{{ off.notes }}</span>
          </li>
        </ul>
      </div>

      <UAlert
        v-if="isPastSelected"
        color="warning"
        variant="soft"
        icon="i-lucide-history"
        :title="t('quickCreate.appointment.dateTime.past.title')"
        :description="t('quickCreate.appointment.dateTime.past.description')"
      />

      <template v-else>
        <div v-if="slots.length" class="space-y-4">
          <p class="text-sm font-medium text-highlighted">
            {{ t('quickCreate.appointment.dateTime.slots') }}
          </p>
          <div v-for="group in slotGroups" :key="group.part" class="space-y-2">
            <p
              class="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted uppercase"
            >
              <UIcon :name="group.icon" class="size-3.5" />
              {{ t(group.labelKey) }}
            </p>
            <div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
              <UButton
                v-for="minutes in group.slots"
                :key="minutes"
                size="sm"
                :color="minutes === slotMinutes ? 'primary' : 'neutral'"
                :variant="minutes === slotMinutes ? 'solid' : 'soft'"
                class="justify-center"
                @click="onSlotSelect(minutes)"
              >
                {{ slotLabel(minutes) }}
              </UButton>
            </div>
          </div>
        </div>

        <div
          v-else
          class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-default py-6 text-center"
        >
          <UIcon :name="emptyIcon" class="size-8 text-dimmed" />
          <p class="text-sm text-muted">{{ emptyMessage }}</p>
        </div>
      </template>

      <div class="space-y-2">
        <UButton
          v-if="!isManual"
          variant="link"
          color="neutral"
          leading-icon="i-lucide-clock"
          class="px-0"
          @click="isManual = true"
        >
          {{ t('quickCreate.appointment.dateTime.manual') }}
        </UButton>
        <USelect
          v-else
          :model-value="slotMinutes ?? undefined"
          :items="manualTimeOptions"
          icon="i-lucide-clock"
          :placeholder="t('quickCreate.appointment.dateTime.selectTime')"
          class="w-full"
          @update:model-value="emit('update:slotMinutes', $event as number)"
        />
        <p v-if="hasConflict" class="flex items-center gap-1.5 text-xs text-warning">
          <UIcon name="i-lucide-triangle-alert" class="size-3.5 shrink-0" />
          {{ t('quickCreate.appointment.dateTime.conflict') }}
        </p>
      </div>
    </template>

    <p v-else class="text-sm text-muted">
      {{ t('quickCreate.appointment.dateTime.pickDate') }}
    </p>
  </div>
</template>
