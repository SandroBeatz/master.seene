import { computed, reactive, type Ref } from 'vue'
import type { CreateTimeBlockDto } from '@entities/time-block'
import { intervalsOverlap, minutesToTimeInput, type Interval } from '@shared/lib/scheduling'
import { addDateInputDays, toUtcIsoFromZonedDateTime } from '@shared/lib/time-zone'

/** Duration presets offered as chips, minutes. Anything else reads as "custom". */
export const TIME_OFF_DURATIONS = [15, 30, 45, 60, 90, 120] as const
export const DEFAULT_TIME_OFF_DURATION = 60

/** Quick-pick reasons for the comment step (i18n `quickCreate.timeOff.reasons.*`). */
export const TIME_OFF_REASONS = ['lunch', 'personal', 'sick', 'vacation', 'training'] as const
export type TimeOffReason = (typeof TIME_OFF_REASONS)[number]

export interface TimeOffWizardState {
  /** Selected day, `YYYY-MM-DD` in the master's timezone. */
  date: string
  allDay: boolean
  /** Start, minutes since midnight; `null` until a slot / manual range is picked. */
  startMinutes: number | null
  /** Length of the break, minutes. Drives the slot grid (which starts fit it). */
  durationMinutes: number
  notes: string
}

export interface CreateTimeOffWizardOptions {
  date: string
  timeZone: Ref<string>
  /** Bookings + existing time offs on a day — a new time off must not overlap them. */
  dayBusy: (date: string) => Interval[]
}

/**
 * Local state + validation of the mobile time-off flow (pick when → reason →
 * create). Same rules as the desktop wizard: a time off never overlaps a
 * booking, and "all day" is only offered while the day has none. Kept free of
 * UI so the rules are unit-testable.
 */
export function createTimeOffWizard(options: CreateTimeOffWizardOptions) {
  const state = reactive<TimeOffWizardState>({
    date: options.date,
    allDay: false,
    startMinutes: null,
    durationMinutes: DEFAULT_TIME_OFF_DURATION,
    notes: '',
  })

  const busy = computed(() => (state.date ? options.dayBusy(state.date) : []))
  const canBeAllDay = computed(() => busy.value.length === 0)

  const range = computed<Interval | null>(() =>
    state.startMinutes == null
      ? null
      : [state.startMinutes, state.startMinutes + state.durationMinutes],
  )

  const overlapsBusy = computed(
    () =>
      range.value != null &&
      busy.value.some((interval) => intervalsOverlap(range.value!, interval)),
  )

  const isWhenValid = computed(() => {
    if (!state.date) return false
    if (state.allDay) return canBeAllDay.value
    return range.value != null && state.durationMinutes > 0 && !overlapsBusy.value
  })

  /** Changing the day invalidates the picked time (and all-day, if it now has bookings). */
  function setDate(date: string) {
    state.date = date
    state.startMinutes = null
    if (!canBeAllDay.value) state.allDay = false
  }

  function setAllDay(value: boolean) {
    state.allDay = value && canBeAllDay.value
  }

  /** A new duration keeps the start only while the longer/shorter break still fits. */
  function setDuration(minutes: number) {
    state.durationMinutes = minutes
    if (overlapsBusy.value) state.startMinutes = null
  }

  /** Manual range: start + derived duration, applied only when valid and free. */
  function setRange(start: number, end: number): 'ok' | 'invalid' | 'overlap' {
    if (end <= start) return 'invalid'
    const candidate: Interval = [start, end]
    if (busy.value.some((interval) => intervalsOverlap(candidate, interval))) return 'overlap'
    state.startMinutes = start
    state.durationMinutes = end - start
    return 'ok'
  }

  /** Appends a quick reason to the comment (skips one that's already there). */
  function addReason(label: string) {
    const current = state.notes.trim()
    if (current.toLowerCase().includes(label.toLowerCase())) return
    state.notes = current ? `${current}, ${label}` : label
  }

  function toDto(): CreateTimeBlockDto | null {
    const tz = options.timeZone.value
    const notes = state.notes.trim() || null
    if (state.allDay) {
      return {
        start_at: toUtcIsoFromZonedDateTime(state.date, '00:00', tz),
        end_at: toUtcIsoFromZonedDateTime(addDateInputDays(state.date, 1), '00:00', tz),
        all_day: true,
        notes,
      }
    }
    if (range.value == null) return null
    const [start, end] = range.value
    // A break running past midnight ends on the next day.
    const endDate = end >= 24 * 60 ? addDateInputDays(state.date, 1) : state.date
    return {
      start_at: toUtcIsoFromZonedDateTime(state.date, minutesToTimeInput(start), tz),
      end_at: toUtcIsoFromZonedDateTime(endDate, minutesToTimeInput(end % (24 * 60)), tz),
      all_day: false,
      notes,
    }
  }

  return {
    state,
    range,
    canBeAllDay,
    overlapsBusy,
    isWhenValid,
    setDate,
    setAllDay,
    setDuration,
    setRange,
    addReason,
    toDto,
  }
}

export type TimeOffWizard = ReturnType<typeof createTimeOffWizard>
