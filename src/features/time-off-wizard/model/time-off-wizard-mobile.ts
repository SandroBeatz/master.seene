import { computed, reactive, type Ref } from 'vue'
import type { CreateTimeBlockDto, TimeBlock } from '@entities/time-block'
import {
  intervalsOverlap,
  minutesToTimeInput,
  timeInputToMinutes,
  type Interval,
} from '@shared/lib/scheduling'
import {
  addDateInputDays,
  getDateTimeInputValue,
  toUtcIsoFromZonedDateTime,
} from '@shared/lib/time-zone'

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
  /** Time off being edited: prefills the state (its own slot must be excluded from `dayBusy`). */
  timeBlock?: TimeBlock
}

const MINUTES_IN_DAY = 24 * 60
const DAY_MS = 24 * 60 * 60 * 1000

export interface TimeOffWizardPrefill {
  state: TimeOffWizardState
  /** Days an all-day time off covers; kept on save so a multi-day one isn't cut to one day. */
  allDayDays: number
}

/** Wizard state of an existing time off, read in the master's timezone. */
export function timeBlockToWizardPrefill(block: TimeBlock, timeZone: string): TimeOffWizardPrefill {
  const start = getDateTimeInputValue(block.start_at, timeZone)
  const notes = block.notes ?? ''
  if (block.all_day) {
    // The end is the exclusive midnight after the last day; dates parsed as UTC
    // so a DST shift in between never skews the day count.
    const end = getDateTimeInputValue(block.end_at, timeZone)
    const days =
      (Date.parse(`${end.date}T00:00:00Z`) - Date.parse(`${start.date}T00:00:00Z`)) / DAY_MS
    return {
      state: {
        date: start.date,
        allDay: true,
        startMinutes: null,
        durationMinutes: DEFAULT_TIME_OFF_DURATION,
        notes,
      },
      allDayDays: Math.max(1, Math.round(days)),
    }
  }
  const duration = Math.round((Date.parse(block.end_at) - Date.parse(block.start_at)) / 60_000)
  return {
    state: {
      date: start.date,
      allDay: false,
      startMinutes: timeInputToMinutes(start.time),
      durationMinutes: Math.max(1, duration),
      notes,
    },
    allDayDays: 1,
  }
}

/**
 * Local state + validation of the mobile time-off flow (pick when → reason →
 * create, or save when editing an existing one). Same rules as the desktop wizard: a time off never overlaps a
 * booking, and "all day" is only offered while the day has none. Kept free of
 * UI so the rules are unit-testable.
 */
export function createTimeOffWizard(options: CreateTimeOffWizardOptions) {
  const prefill = options.timeBlock
    ? timeBlockToWizardPrefill(options.timeBlock, options.timeZone.value)
    : null
  const initial: TimeOffWizardState = prefill?.state ?? {
    date: options.date,
    allDay: false,
    startMinutes: null,
    durationMinutes: DEFAULT_TIME_OFF_DURATION,
    notes: '',
  }
  const allDayDays = prefill?.allDayDays ?? 1
  const state = reactive<TimeOffWizardState>({ ...initial })

  /** Whether anything differs from the starting point (the edited time off, or a blank one). */
  const isChanged = computed(
    () =>
      state.date !== initial.date ||
      state.allDay !== initial.allDay ||
      state.notes.trim() !== initial.notes.trim() ||
      (!state.allDay &&
        (state.startMinutes !== initial.startMinutes ||
          state.durationMinutes !== initial.durationMinutes)),
  )

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
        end_at: toUtcIsoFromZonedDateTime(addDateInputDays(state.date, allDayDays), '00:00', tz),
        all_day: true,
        notes,
      }
    }
    if (range.value == null) return null
    const [start, end] = range.value
    // A break running past midnight ends on the next day.
    const endDate = end >= MINUTES_IN_DAY ? addDateInputDays(state.date, 1) : state.date
    return {
      start_at: toUtcIsoFromZonedDateTime(state.date, minutesToTimeInput(start), tz),
      end_at: toUtcIsoFromZonedDateTime(endDate, minutesToTimeInput(end % MINUTES_IN_DAY), tz),
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
    isChanged,
    setDate,
    setAllDay,
    setDuration,
    setRange,
    addReason,
    toDto,
  }
}

export type TimeOffWizard = ReturnType<typeof createTimeOffWizard>
