import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { DAY_ORDER, normalizeSchedule, toMinutes, validateSchedule } from '@entities/master'
import type {
  MasterSchedule,
  MasterScheduleDayKey,
  NormalizedSchedule,
  NormalizedScheduleDay,
  ScheduleDayError,
} from '@entities/master'

/** Default break inserted by "Add break", clamped into the day's hours. */
const DEFAULT_BREAK_START_MINUTES = 13 * 60
const DEFAULT_BREAK_LENGTH_MINUTES = 60

function fromMinutes(total: number): string {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export interface WorkingHoursDayView {
  key: MasterScheduleDayKey
  day: NormalizedScheduleDay
  errors: ScheduleDayError[]
}

export interface UseWorkingHours {
  /** The editable schedule — pass to `useDirtyForm` for dirty tracking. */
  state: Ref<NormalizedSchedule>
  /** Days in week order with their live data and current validation errors. */
  dayViews: ComputedRef<WorkingHoursDayView[]>
  /** True when every enabled day passes the hard validation rules. */
  isValid: ComputedRef<boolean>
  /** Replace the state from a stored (possibly partial) schedule. */
  seed: (schedule: MasterSchedule | null | undefined) => void
  setEnabled: (key: MasterScheduleDayKey, enabled: boolean) => void
  setStart: (key: MasterScheduleDayKey, value: string) => void
  setEnd: (key: MasterScheduleDayKey, value: string) => void
  setBreak: (
    key: MasterScheduleDayKey,
    index: number,
    field: 'start' | 'end',
    value: string,
  ) => void
  /** Append a break to a day, defaulting to 13:00–14:00 clamped into its hours. */
  addBreak: (key: MasterScheduleDayKey) => void
  removeBreak: (key: MasterScheduleDayKey, index: number) => void
  /** Copy a day's hours and breaks onto every other enabled day. */
  copyDayToAll: (key: MasterScheduleDayKey) => void
  /** The current state as a storable `MasterSchedule`. */
  toStored: () => MasterSchedule
}

export function useWorkingHours(): UseWorkingHours {
  const state = ref<NormalizedSchedule>(normalizeSchedule(null))

  const validation = computed(() => validateSchedule(state.value))

  const dayViews = computed<WorkingHoursDayView[]>(() =>
    DAY_ORDER.map((key) => ({
      key,
      day: state.value.days[key],
      errors: validation.value.days[key],
    })),
  )

  const isValid = computed(() => validation.value.ok)

  function seed(schedule: MasterSchedule | null | undefined): void {
    state.value = normalizeSchedule(schedule)
  }

  function setEnabled(key: MasterScheduleDayKey, enabled: boolean): void {
    state.value.days[key].enabled = enabled
  }

  function setStart(key: MasterScheduleDayKey, value: string): void {
    state.value.days[key].start = value
  }

  function setEnd(key: MasterScheduleDayKey, value: string): void {
    state.value.days[key].end = value
  }

  function setBreak(
    key: MasterScheduleDayKey,
    index: number,
    field: 'start' | 'end',
    value: string,
  ): void {
    const slot = state.value.days[key].breaks[index]
    if (slot) slot[field] = value
  }

  function addBreak(key: MasterScheduleDayKey): void {
    const day = state.value.days[key]
    const dayStart = toMinutes(day.start)
    const dayEnd = toMinutes(day.end)

    let start = DEFAULT_BREAK_START_MINUTES
    let end = DEFAULT_BREAK_START_MINUTES + DEFAULT_BREAK_LENGTH_MINUTES

    // Fall back to a break at the start of the day when 13:00–14:00 doesn't fit.
    if (start < dayStart || end > dayEnd) {
      start = dayStart
      end = Math.min(dayStart + DEFAULT_BREAK_LENGTH_MINUTES, dayEnd)
    }

    day.breaks.push({ start: fromMinutes(start), end: fromMinutes(end) })
  }

  function removeBreak(key: MasterScheduleDayKey, index: number): void {
    state.value.days[key].breaks.splice(index, 1)
  }

  function copyDayToAll(key: MasterScheduleDayKey): void {
    const source = state.value.days[key]

    for (const targetKey of DAY_ORDER) {
      if (targetKey === key) continue
      const target = state.value.days[targetKey]
      if (!target.enabled) continue

      target.start = source.start
      target.end = source.end
      target.breaks = source.breaks.map((slot) => ({ ...slot }))
    }
  }

  function toStored(): MasterSchedule {
    return JSON.parse(JSON.stringify(state.value)) as MasterSchedule
  }

  return {
    state,
    dayViews,
    isValid,
    seed,
    setEnabled,
    setStart,
    setEnd,
    setBreak,
    addBreak,
    removeBreak,
    copyDayToAll,
    toStored,
  }
}
