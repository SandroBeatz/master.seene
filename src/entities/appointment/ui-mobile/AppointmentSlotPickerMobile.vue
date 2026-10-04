<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IonButton,
  IonButtons,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonModal,
  IonRippleEffect,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  alertController,
  createGesture,
  type Gesture,
} from '@ionic/vue'
import {
  alertCircleOutline,
  banOutline,
  calendarClearOutline,
  calendarOutline,
  cafeOutline,
  chevronBackOutline,
  chevronDownOutline,
  chevronForwardOutline,
  closeOutline,
  moonOutline,
  partlySunnyOutline,
  sunnyOutline,
  timeOutline,
} from 'ionicons/icons'
import type { DayState, MasterSchedule } from '@entities/master/@x/appointment'
import { useFormats } from '@shared/lib/formats'
import {
  groupSlotsByPartOfDay,
  minutesToTimeInput,
  timeInputToMinutes,
  type PartOfDay,
} from '@shared/lib/scheduling'
import { addDateInputDays } from '@shared/lib/time-zone'
import type { DaySlot, DaySlotState } from '../model/day-slots'
import { useAppointmentAvailability } from '../model/use-appointment-availability'

const props = withDefaults(
  defineProps<{
    /** Selected day, `YYYY-MM-DD` in the master's timezone; '' when none yet. */
    date: string
    /** Selected start, minutes since midnight; `null` when none yet. */
    slotMinutes: number | null
    userId: string
    timeZone: string
    schedule: MasterSchedule | null | undefined
    stepMinutes: number
    durationMinutes: number
    /** 0 = Sunday … 6 = Saturday. */
    firstDayOfWeek?: number
    hourCycle?: 'h12' | 'h23'
    /** Appointment being rescheduled — excluded from busy time. */
    excludeAppointmentId?: string | null
  }>(),
  { firstDayOfWeek: 1, hourCycle: undefined, excludeAppointmentId: null },
)

const emit = defineEmits<{
  'update:date': [value: string]
  'update:slotMinutes': [value: number | null]
}>()

const { t, locale } = useI18n()
const formats = useFormats()

// --- Week strip ---
/** `YYYY-MM-DD` → local `Date` at midnight (for Intl formatting only). */
function toLocalDate(date: string): Date {
  const [year = 1970, month = 1, day = 1] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function weekStartOf(date: string): string {
  const offset = (toLocalDate(date).getDay() - props.firstDayOfWeek + 7) % 7
  return addDateInputDays(date, -offset)
}

const weekStart = ref('')
const anchorDate = computed(() => weekStart.value || props.date)

const availability = useAppointmentAvailability({
  userId: toRef(props, 'userId'),
  timeZone: toRef(props, 'timeZone'),
  schedule: toRef(props, 'schedule'),
  stepMinutes: toRef(props, 'stepMinutes'),
  durationMinutes: toRef(props, 'durationMinutes'),
  excludeAppointmentId: toRef(props, 'excludeAppointmentId'),
  anchorDate,
})
const today = availability.today

watch(
  () => props.date,
  (date) => {
    weekStart.value = weekStartOf(date || today.value)
  },
  { immediate: true },
)

const weekdayFormatter = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'short' }))

const weekDays = computed(() =>
  Array.from({ length: 7 }, (_, index) => {
    const date = addDateInputDays(weekStart.value, index)
    const isPast = date < today.value
    return {
      date,
      day: Number(date.slice(8, 10)),
      weekday: weekdayFormatter.value.format(toLocalDate(date)),
      isToday: date === today.value,
      isPast,
      state: isPast ? null : availability.dayState(date),
    }
  }),
)

const monthLabel = computed(() =>
  formats.monthYear(toLocalDate(addDateInputDays(weekStart.value, 3))),
)
const showTodayButton = computed(
  () => today.value < weekStart.value || today.value >= addDateInputDays(weekStart.value, 7),
)

function shiftWeek(direction: 1 | -1) {
  weekStart.value = addDateInputDays(weekStart.value, direction * 7)
}

function selectDate(date: string) {
  if (date === props.date) return
  emit('update:date', date)
  emit('update:slotMinutes', null)
}

function goToday() {
  weekStart.value = weekStartOf(today.value)
  selectDate(today.value)
}

// Horizontal swipe on the strip pages between weeks.
const stripEl = ref<HTMLElement | null>(null)
let gesture: Gesture | undefined

onMounted(() => {
  if (!stripEl.value) return
  gesture = createGesture({
    el: stripEl.value,
    gestureName: 'appointment-week-swipe',
    direction: 'x',
    threshold: 12,
    onEnd: (detail) => {
      if (Math.abs(detail.deltaX) < 48) return
      shiftWeek(detail.deltaX < 0 ? 1 : -1)
    },
  })
  gesture.enable()
})

onBeforeUnmount(() => gesture?.destroy())

// --- Month calendar sheet ---
const isCalendarOpen = ref(false)

const HIGHLIGHT_BY_STATE: Record<DayState, { textColor: string; backgroundColor: string }> = {
  available: {
    textColor: 'var(--ion-color-primary-shade)',
    backgroundColor: 'rgba(var(--ion-color-primary-rgb), 0.14)',
  },
  full: {
    textColor: 'var(--ion-color-warning-shade)',
    backgroundColor: 'rgba(var(--ion-color-warning-rgb), 0.16)',
  },
  'day-off': {
    textColor: 'var(--ion-color-medium)',
    backgroundColor: 'transparent',
  },
}

function highlightedDates(isoString: string) {
  const date = isoString.slice(0, 10)
  if (date < today.value) return undefined
  const state = availability.dayState(date)
  return state ? HIGHLIGHT_BY_STATE[state] : undefined
}

function onCalendarChange(event: CustomEvent<{ value?: string | string[] | null }>) {
  const value = event.detail.value
  if (typeof value !== 'string') return
  selectDate(value.slice(0, 10))
  isCalendarOpen.value = false
}

// --- Selected day ---
const hasDate = computed(() => Boolean(props.date))
const isPastDay = computed(() => hasDate.value && props.date < today.value)
const isDayLoaded = computed(() => hasDate.value && availability.isLoaded(props.date))
const selectedDayState = computed(() => (hasDate.value ? availability.dayState(props.date) : null))
const slots = computed(() => (hasDate.value ? availability.daySlots(props.date) : []))
const freeCount = computed(() => slots.value.filter((slot) => slot.state === 'free').length)
const occupancy = computed(() => (hasDate.value ? availability.dayOccupancy(props.date) : null))
const timeOffs = computed(() => (hasDate.value ? availability.dayTimeOffs(props.date) : []))
const dayTitle = computed(() => (hasDate.value ? formats.dateDay(toLocalDate(props.date)) : ''))

const dayStatusLabel = computed(() => {
  if (isPastDay.value) return t('quickCreate.appointment.dateTime.past.title')
  if (selectedDayState.value === 'day-off')
    return t('quickCreate.appointment.dateTime.legend.dayOff')
  if (selectedDayState.value === 'full') return t('quickCreate.appointment.dateTime.legend.full')
  return t(
    'quickCreate.appointment.dateTime.freeCount',
    { count: freeCount.value },
    freeCount.value,
  )
})

// --- Occupancy bar ---
function percentOf(minutes: number): number {
  const window = occupancy.value?.window
  if (!window) return 0
  const span = window.workEnd - window.workStart
  return ((minutes - window.workStart) / span) * 100
}

function segmentStyle(start: number, end: number) {
  return { left: `${percentOf(start)}%`, width: `${percentOf(end) - percentOf(start)}%` }
}

const selectedSegment = computed(() => {
  const window = occupancy.value?.window
  if (props.slotMinutes == null || !window) return null
  const start = Math.max(props.slotMinutes, window.workStart)
  const end = Math.min(props.slotMinutes + Math.max(props.durationMinutes, 1), window.workEnd)
  return end > start ? segmentStyle(start, end) : null
})

const nowMarker = computed(() => {
  const window = occupancy.value?.window
  if (!window || props.date !== today.value) return null
  const value = availability.nowMinutes.value
  return value > window.workStart && value < window.workEnd ? `${percentOf(value)}%` : null
})

// --- Slot grid ---
const GROUP_ICON: Record<PartOfDay, string> = {
  morning: partlySunnyOutline,
  day: sunnyOutline,
  evening: moonOutline,
}

const slotByMinutes = computed(() => new Map(slots.value.map((slot) => [slot.minutes, slot])))
const slotGroups = computed(() =>
  groupSlotsByPartOfDay(slots.value.map((slot) => slot.minutes)).map((group) => ({
    part: group.part,
    icon: GROUP_ICON[group.part],
    slots: group.slots
      .map((minutes) => slotByMinutes.value.get(minutes))
      .filter((slot): slot is DaySlot => Boolean(slot)),
  })),
)

function timeLabel(minutes: number): string {
  return formats.time(minutesToTimeInput(minutes))
}

function slotAriaLabel(slot: DaySlot): string {
  return `${timeLabel(slot.minutes)}, ${t(`quickCreate.appointment.dateTime.legend.${slot.state}`)}`
}

async function confirmConflict(): Promise<boolean> {
  const alert = await alertController.create({
    header: t('quickCreate.appointment.dateTime.conflictConfirm.title'),
    message: t('quickCreate.appointment.dateTime.conflictConfirm.message'),
    buttons: [
      { text: t('common.cancel'), role: 'cancel' },
      { text: t('quickCreate.appointment.dateTime.conflictConfirm.confirm'), role: 'confirm' },
    ],
  })
  await alert.present()
  const result = await alert.onDidDismiss()
  return result.role === 'confirm'
}

async function selectSlot(slot: DaySlot) {
  if (slot.state !== 'free' && !(await confirmConflict())) return
  emit('update:slotMinutes', slot.minutes)
}

// --- Manual time (off-grid, past days, days off, overlaps) ---
const isTimeOpen = ref(false)
const manualMinuteValues = computed(() => {
  const step = props.stepMinutes > 0 && props.stepMinutes <= 60 ? props.stepMinutes : 5
  return Array.from({ length: Math.ceil(60 / step) }, (_, index) => index * step).join(',')
})
const manualValue = computed(() => {
  const minutes = props.slotMinutes ?? slots.value[0]?.minutes ?? 9 * 60
  return `${props.date || today.value}T${minutesToTimeInput(minutes)}:00`
})
const manualDraft = ref<number | null>(null)

function openManualTime() {
  manualDraft.value = timeInputToMinutes(manualValue.value.slice(11, 16))
  isTimeOpen.value = true
}

function onManualChange(event: CustomEvent<{ value?: string | string[] | null }>) {
  const value = event.detail.value
  if (typeof value === 'string') manualDraft.value = timeInputToMinutes(value.slice(11, 16))
}

async function applyManualTime() {
  const minutes = manualDraft.value
  isTimeOpen.value = false
  if (minutes == null || !hasDate.value) return
  if (availability.hasConflict(props.date, minutes) && !(await confirmConflict())) return
  emit('update:slotMinutes', minutes)
}

// Picked time that isn't one of the grid's starts (manual, past day, day off).
const offGridSelection = computed(() => {
  if (props.slotMinutes == null || slotByMinutes.value.has(props.slotMinutes)) return null
  return timeLabel(props.slotMinutes)
})
const selectedHasConflict = computed(
  () =>
    hasDate.value &&
    props.slotMinutes != null &&
    availability.hasConflict(props.date, props.slotMinutes),
)

const SLOT_LEGEND: DaySlotState[] = ['free', 'busy', 'short']
</script>

<template>
  <div class="slot-picker">
    <!-- Month + week navigation -->
    <div class="slot-picker__nav">
      <button
        type="button"
        class="slot-picker__month ion-activatable"
        :aria-label="t('quickCreate.appointment.dateTime.openCalendar')"
        @click="isCalendarOpen = true"
      >
        <span>{{ monthLabel }}</span>
        <ion-icon :icon="chevronDownOutline" aria-hidden="true" />
        <ion-ripple-effect />
      </button>

      <div class="slot-picker__nav-actions">
        <ion-button
          v-if="showTodayButton"
          size="small"
          fill="clear"
          class="slot-picker__today"
          @click="goToday"
        >
          {{ t('quickCreate.appointment.dateTime.today') }}
        </ion-button>
        <ion-button
          fill="clear"
          color="dark"
          size="small"
          :aria-label="t('quickCreate.appointment.dateTime.previousWeek')"
          @click="shiftWeek(-1)"
        >
          <ion-icon slot="icon-only" :icon="chevronBackOutline" aria-hidden="true" />
        </ion-button>
        <ion-button
          fill="clear"
          color="dark"
          size="small"
          :aria-label="t('quickCreate.appointment.dateTime.nextWeek')"
          @click="shiftWeek(1)"
        >
          <ion-icon slot="icon-only" :icon="chevronForwardOutline" aria-hidden="true" />
        </ion-button>
      </div>
    </div>

    <div ref="stripEl" class="slot-picker__week" role="listbox">
      <button
        v-for="day in weekDays"
        :key="day.date"
        type="button"
        role="option"
        class="slot-picker__day ion-activatable"
        :class="{
          'slot-picker__day--selected': day.date === date,
          'slot-picker__day--today': day.isToday,
          'slot-picker__day--past': day.isPast,
        }"
        :aria-selected="day.date === date"
        :data-testid="`slot-picker-day-${day.date}`"
        @click="selectDate(day.date)"
      >
        <span class="slot-picker__weekday">{{ day.weekday }}</span>
        <span class="slot-picker__day-number">{{ day.day }}</span>
        <span
          class="slot-picker__marker"
          :class="day.state ? `slot-picker__marker--${day.state}` : null"
          aria-hidden="true"
        />
        <ion-ripple-effect />
      </button>
    </div>

    <div class="slot-picker__legend" aria-hidden="true">
      <span
        ><i class="slot-picker__marker slot-picker__marker--available" />{{
          t('quickCreate.appointment.dateTime.legend.available')
        }}</span
      >
      <span
        ><i class="slot-picker__marker slot-picker__marker--full" />{{
          t('quickCreate.appointment.dateTime.legend.full')
        }}</span
      >
      <span
        ><i class="slot-picker__marker slot-picker__marker--day-off" />{{
          t('quickCreate.appointment.dateTime.legend.dayOff')
        }}</span
      >
    </div>

    <p v-if="!hasDate" class="slot-picker__hint">
      {{ t('quickCreate.appointment.dateTime.pickDate') }}
    </p>

    <template v-else>
      <!-- Selected day summary + occupancy -->
      <section class="slot-picker__day-card">
        <header class="slot-picker__day-header">
          <h3>{{ dayTitle }}</h3>
          <span
            class="slot-picker__day-status"
            :class="
              selectedDayState && !isPastDay ? `slot-picker__day-status--${selectedDayState}` : null
            "
          >
            {{ dayStatusLabel }}
          </span>
        </header>

        <div v-if="occupancy" class="slot-picker__occupancy">
          <div class="slot-picker__bar">
            <span
              v-for="([start, end], index) in occupancy.busy"
              :key="index"
              class="slot-picker__bar-busy"
              :style="segmentStyle(start, end)"
            />
            <span
              v-if="selectedSegment"
              class="slot-picker__bar-selected"
              :style="selectedSegment"
            />
            <span v-if="nowMarker" class="slot-picker__bar-now" :style="{ left: nowMarker }" />
          </div>
          <div class="slot-picker__bar-labels">
            <span>{{ timeLabel(occupancy.window.workStart) }}</span>
            <span>{{ timeLabel(occupancy.window.workEnd) }}</span>
          </div>
        </div>

        <ul v-if="timeOffs.length" class="slot-picker__time-offs">
          <li v-for="(off, index) in timeOffs" :key="index">
            <ion-icon :icon="banOutline" aria-hidden="true" />
            <strong>
              {{
                off.allDay
                  ? t('quickCreate.appointment.dateTime.allDay')
                  : `${timeLabel(off.interval[0])} – ${timeLabel(off.interval[1])}`
              }}
            </strong>
            <span v-if="off.notes">{{ off.notes }}</span>
          </li>
        </ul>
      </section>

      <!-- Slots -->
      <div v-if="!isDayLoaded && !isPastDay" class="slot-picker__grid" aria-hidden="true">
        <ion-skeleton-text v-for="index in 8" :key="index" animated class="slot-picker__skeleton" />
      </div>

      <div v-else-if="isPastDay" class="slot-picker__empty">
        <ion-icon :icon="calendarClearOutline" color="warning" aria-hidden="true" />
        <p>{{ t('quickCreate.appointment.dateTime.past.description') }}</p>
      </div>

      <div v-else-if="!slots.length" class="slot-picker__empty">
        <ion-icon
          :icon="selectedDayState === 'day-off' ? cafeOutline : calendarOutline"
          color="medium"
          aria-hidden="true"
        />
        <p>
          {{
            selectedDayState === 'day-off'
              ? t('quickCreate.appointment.dateTime.dayOff')
              : t('quickCreate.appointment.dateTime.noSlots')
          }}
        </p>
      </div>

      <template v-else>
        <section v-for="group in slotGroups" :key="group.part" class="slot-picker__group">
          <h4 class="slot-picker__group-title">
            <ion-icon :icon="group.icon" aria-hidden="true" />
            {{ t(`quickCreate.appointment.dateTime.groups.${group.part}`) }}
          </h4>
          <div class="slot-picker__grid">
            <button
              v-for="slot in group.slots"
              :key="slot.minutes"
              type="button"
              class="slot-picker__slot ion-activatable"
              :class="[
                `slot-picker__slot--${slot.state}`,
                { 'slot-picker__slot--selected': slot.minutes === slotMinutes },
              ]"
              :aria-pressed="slot.minutes === slotMinutes"
              :aria-label="slotAriaLabel(slot)"
              :data-testid="`slot-picker-slot-${slot.minutes}`"
              @click="selectSlot(slot)"
            >
              {{ timeLabel(slot.minutes) }}
              <ion-ripple-effect />
            </button>
          </div>
        </section>

        <div class="slot-picker__slot-legend" aria-hidden="true">
          <span v-for="state in SLOT_LEGEND" :key="state">
            <i class="slot-picker__slot-swatch" :class="`slot-picker__slot--${state}`" />
            {{ t(`quickCreate.appointment.dateTime.legend.${state}`) }}
          </span>
        </div>
      </template>

      <!-- Manual time escape hatch -->
      <div class="slot-picker__manual">
        <ion-button
          fill="clear"
          size="small"
          class="slot-picker__manual-button"
          @click="openManualTime"
        >
          <ion-icon slot="start" :icon="timeOutline" aria-hidden="true" />
          {{ t('quickCreate.appointment.dateTime.manual') }}
        </ion-button>
        <span v-if="offGridSelection" class="slot-picker__manual-value">
          {{ t('quickCreate.appointment.dateTime.selected') }}:
          <strong>{{ offGridSelection }}</strong>
        </span>
      </div>

      <p v-if="selectedHasConflict" class="slot-picker__conflict">
        <ion-icon :icon="alertCircleOutline" aria-hidden="true" />
        {{ t('quickCreate.appointment.dateTime.conflict') }}
      </p>
    </template>

    <ion-modal
      :is-open="isCalendarOpen"
      class="slot-picker__sheet"
      :breakpoints="[0, 1]"
      :initial-breakpoint="1"
      :handle="true"
      @did-dismiss="isCalendarOpen = false"
    >
      <ion-header class="ion-no-border">
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button
              fill="clear"
              color="dark"
              :aria-label="t('common.close')"
              @click="isCalendarOpen = false"
            >
              <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
            </ion-button>
          </ion-buttons>
          <ion-title>{{ t('quickCreate.appointment.dateTime.calendarTitle') }}</ion-title>
        </ion-toolbar>
      </ion-header>
      <div class="slot-picker__sheet-body">
        <ion-datetime
          presentation="date"
          size="cover"
          :value="date || today"
          :locale="locale"
          :first-day-of-week="firstDayOfWeek"
          :highlighted-dates="highlightedDates"
          @ion-change="onCalendarChange"
        />
      </div>
    </ion-modal>

    <ion-modal
      :is-open="isTimeOpen"
      class="slot-picker__sheet slot-picker__sheet--time"
      :breakpoints="[0, 1]"
      :initial-breakpoint="1"
      :handle="true"
      @did-dismiss="isTimeOpen = false"
    >
      <ion-header class="ion-no-border">
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button
              fill="clear"
              color="dark"
              :aria-label="t('common.close')"
              @click="isTimeOpen = false"
            >
              <ion-icon slot="icon-only" :icon="closeOutline" aria-hidden="true" />
            </ion-button>
          </ion-buttons>
          <ion-title>{{ t('quickCreate.appointment.dateTime.selectTime') }}</ion-title>
          <ion-buttons slot="end">
            <ion-button strong @click="applyManualTime">{{ t('common.done') }}</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <div class="slot-picker__sheet-body">
        <ion-datetime
          presentation="time"
          size="cover"
          prefer-wheel
          :value="manualValue"
          :locale="locale"
          :hour-cycle="hourCycle"
          :minute-values="manualMinuteValues"
          @ion-change="onManualChange"
        />
      </div>
    </ion-modal>
  </div>
</template>

<style scoped>
.slot-picker {
  --se-slot-radius: 12px;
  --se-slot-height: 42px;
  --se-picker-inset-x: 16px;

  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 8px;
}

/* --- Navigation --- */
.slot-picker__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px 0 var(--se-picker-inset-x);
}

.slot-picker__month {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  padding: 6px 8px;
  margin-inline-start: -8px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--ion-text-color);
  font: inherit;
  font-size: 1.05rem;
  font-weight: 700;
  text-transform: capitalize;
}

.slot-picker__month ion-icon {
  color: var(--ion-color-primary);
  font-size: 1rem;
}

.slot-picker__nav-actions {
  display: flex;
  align-items: center;
}

.slot-picker__today {
  text-transform: none;
  font-weight: 600;
}

/* --- Week strip --- */
.slot-picker__week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  padding: 0 var(--se-picker-inset-x);
  touch-action: pan-y;
}

.slot-picker__day {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  padding: 8px 0 7px;
  border: 0;
  border-radius: 14px;
  background: var(--se-surface-card, var(--ion-background-color));
  color: var(--ion-text-color);
  font: inherit;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.slot-picker__weekday {
  color: var(--ion-color-medium);
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
}

.slot-picker__day-number {
  font-size: 1.05rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.slot-picker__day--today .slot-picker__day-number {
  color: var(--ion-color-primary);
}

.slot-picker__day--past {
  opacity: 0.45;
}

.slot-picker__day--selected {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}

.slot-picker__day--selected .slot-picker__weekday,
.slot-picker__day--selected .slot-picker__day-number {
  color: var(--ion-color-primary-contrast);
}

.slot-picker__marker {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.slot-picker__marker--available {
  background: var(--ion-color-success);
}

.slot-picker__marker--full {
  background: var(--ion-color-warning);
}

.slot-picker__marker--day-off {
  box-shadow: inset 0 0 0 1.5px var(--ion-color-medium);
}

.slot-picker__day--selected .slot-picker__marker--available,
.slot-picker__day--selected .slot-picker__marker--full {
  box-shadow: 0 0 0 1.5px var(--ion-color-primary-contrast);
}

.slot-picker__day--selected .slot-picker__marker--day-off {
  box-shadow: inset 0 0 0 1.5px var(--ion-color-primary-contrast);
}

.slot-picker__legend,
.slot-picker__slot-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 14px;
  padding: 0 var(--se-picker-inset-x);
  color: var(--ion-color-medium);
  font-size: 0.72rem;
}

.slot-picker__legend span,
.slot-picker__slot-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.slot-picker__hint {
  margin: 12px var(--se-picker-inset-x);
  color: var(--ion-color-medium);
  text-align: center;
}

/* --- Day card --- */
.slot-picker__day-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 4px var(--se-picker-inset-x) 0;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--se-surface-card, var(--ion-background-color));
}

.slot-picker__day-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.slot-picker__day-header h3 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  text-transform: capitalize;
}

.slot-picker__day-status {
  flex-shrink: 0;
  color: var(--ion-color-medium);
  font-size: 0.78rem;
  font-weight: 600;
}

.slot-picker__day-status--available {
  color: var(--ion-color-success-shade);
}

.slot-picker__day-status--full {
  color: var(--ion-color-warning-shade);
}

.slot-picker__bar {
  position: relative;
  height: 10px;
  overflow: hidden;
  border-radius: 5px;
  background: rgba(var(--ion-color-success-rgb), 0.22);
}

.slot-picker__bar-busy,
.slot-picker__bar-selected {
  position: absolute;
  top: 0;
  bottom: 0;
}

.slot-picker__bar-busy {
  background: var(--ion-background-color-step-300, var(--ion-color-medium));
}

.slot-picker__bar-selected {
  border-radius: 3px;
  background: var(--ion-color-primary);
}

.slot-picker__bar-now {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: var(--ion-color-danger);
  transform: translateX(-1px);
}

.slot-picker__bar-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  color: var(--ion-color-medium);
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
}

.slot-picker__time-offs {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.8rem;
}

.slot-picker__time-offs li {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.slot-picker__time-offs ion-icon {
  flex-shrink: 0;
  color: var(--ion-color-medium);
}

.slot-picker__time-offs span {
  overflow: hidden;
  color: var(--ion-color-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* --- Slots --- */
.slot-picker__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slot-picker__group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px var(--se-picker-inset-x) 0;
  color: var(--ion-color-medium);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.slot-picker__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 0 var(--se-picker-inset-x);
}

.slot-picker__skeleton {
  height: var(--se-slot-height);
  margin: 0;
  border-radius: var(--se-slot-radius);
}

.slot-picker__slot {
  position: relative;
  overflow: hidden;
  min-height: var(--se-slot-height);
  border: 1.5px solid transparent;
  border-radius: var(--se-slot-radius);
  font: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.slot-picker__slot--free {
  background: var(--se-surface-card, var(--ion-background-color));
  border-color: rgba(var(--ion-color-success-rgb), 0.45);
  color: var(--ion-text-color);
}

.slot-picker__slot--busy {
  background: var(--ion-background-color-step-100, transparent);
  color: var(--ion-color-medium);
  font-weight: 500;
  text-decoration: line-through;
}

.slot-picker__slot--short {
  background: transparent;
  border-style: dashed;
  border-color: var(--se-separator, var(--ion-color-medium));
  color: var(--ion-color-medium);
  font-weight: 500;
}

.slot-picker__slot--selected {
  background: var(--ion-color-primary);
  border-color: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  font-weight: 700;
  text-decoration: none;
}

.slot-picker__slot-swatch {
  display: inline-block;
  width: 16px;
  height: 11px;
  border-width: 1.5px;
  border-radius: 4px;
}

.slot-picker__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 0 var(--se-picker-inset-x);
  padding: 22px 16px;
  border: 1.5px dashed var(--se-separator, var(--ion-color-medium));
  border-radius: 14px;
  text-align: center;
}

.slot-picker__empty ion-icon {
  font-size: 2rem;
}

.slot-picker__empty p {
  max-width: 300px;
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 0.85rem;
  line-height: 1.4;
}

.slot-picker__manual {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 12px;
  padding: 0 var(--se-picker-inset-x) 0 6px;
}

.slot-picker__manual-button {
  text-transform: none;
  font-weight: 600;
}

.slot-picker__manual-value {
  color: var(--ion-color-medium);
  font-size: 0.82rem;
}

.slot-picker__manual-value strong {
  color: var(--ion-text-color);
}

.slot-picker__conflict {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 var(--se-picker-inset-x);
  color: var(--ion-color-warning-shade);
  font-size: 0.8rem;
}

/* --- Sheets --- */
.slot-picker__sheet {
  --height: auto;
  --border-radius: 20px 20px 0 0;
}

.slot-picker__sheet ion-toolbar,
.slot-picker__sheet-body {
  --background: var(--se-surface-page, var(--ion-background-color));
}

.slot-picker__sheet ion-datetime {
  --background: var(--se-surface-page, var(--ion-background-color));

  margin: 0 auto;
}

.slot-picker__sheet-body {
  padding-bottom: calc(12px + var(--safe-area-bottom, 0px));
}
</style>
