import { computed, type Ref } from 'vue'
import {
  classifyDayState,
  resolveDayWindow,
  type DayState,
  type DayWindow,
  type MasterSchedule,
} from '@entities/master/@x/appointment'
import { useTimeBlocksQuery } from '@entities/time-block/@x/appointment'
import { intervalsOverlap, mergeIntervals, type Interval } from '@shared/lib/scheduling'
import { useNowMinute } from '@shared/lib/now'
import {
  addDateInputDays,
  getDateTimeInputValue,
  toUtcIsoFromZonedDateTime,
} from '@shared/lib/time-zone'
import { appointmentToBusyInterval, timeBlockToBusyInterval } from './busy-intervals'
import { buildDaySlots, type DaySlot } from './day-slots'
import { useAppointmentsQuery } from './appointment.queries'

const MINUTES_IN_DAY = 24 * 60

export interface AppointmentAvailabilityOptions {
  userId: Ref<string>
  timeZone: Ref<string>
  schedule: Ref<MasterSchedule | null | undefined>
  stepMinutes: Ref<number>
  /** Duration the booking must fit (sum of service durations), minutes. */
  durationMinutes: Ref<number>
  /** Day the picker is looking at, `YYYY-MM-DD`; data loads for its month (± a week). */
  anchorDate: Ref<string>
  /** Appointment being rescheduled — never counts as busy against itself. */
  excludeAppointmentId?: Ref<string | null | undefined>
}

export interface DayTimeOff {
  interval: Interval
  allDay: boolean
  notes: string | null
}

export interface DayOccupancy {
  window: DayWindow
  /** Merged busy blocks (bookings + time offs + breaks) clipped to the window. */
  busy: Interval[]
}

/**
 * Availability for the appointment date/slot picker: per-day state (calendar
 * markers), the classified slot grid, occupancy and time offs. Loads bookings
 * and time offs for the anchor's month padded by a week on each side, so a week
 * strip crossing a month boundary is fully covered. Days outside the loaded
 * range report `null` / empty until the anchor moves there.
 */
export function useAppointmentAvailability(options: AppointmentAvailabilityOptions) {
  const now = useNowMinute()
  const nowInput = computed(() => getDateTimeInputValue(now.value, options.timeZone.value))
  const today = computed(() => nowInput.value.date)
  const nowMinutes = computed(() => {
    const [hours = '0', minutes = '0'] = nowInput.value.time.split(':')
    return Number(hours) * 60 + Number(minutes)
  })

  // Keyed by month only, so moving between days of one month never refetches.
  const anchorMonth = computed(() => (options.anchorDate.value || today.value).slice(0, 7))
  const loadedDays = computed(() => {
    const first = `${anchorMonth.value}-01`
    const [year = 0, month = 1] = anchorMonth.value.split('-').map(Number)
    const nextFirst =
      month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`
    return { from: addDateInputDays(first, -7), to: addDateInputDays(nextFirst, 7) }
  })
  const range = computed(() => ({
    from: toUtcIsoFromZonedDateTime(loadedDays.value.from, '00:00', options.timeZone.value),
    to: toUtcIsoFromZonedDateTime(loadedDays.value.to, '00:00', options.timeZone.value),
  }))

  const appointmentsQuery = useAppointmentsQuery(options.userId, range)
  const timeBlocksQuery = useTimeBlocksQuery(options.userId, range)

  const isLoading = computed(
    () => appointmentsQuery.isLoading.value || timeBlocksQuery.isLoading.value,
  )
  const isReady = computed(
    () => appointmentsQuery.data.value != null && timeBlocksQuery.data.value != null,
  )

  const appointments = computed(() => {
    const excluded = options.excludeAppointmentId?.value
    const list = appointmentsQuery.data.value ?? []
    return excluded ? list.filter((appointment) => appointment.id !== excluded) : list
  })

  function isLoaded(date: string): boolean {
    return isReady.value && date >= loadedDays.value.from && date < loadedDays.value.to
  }

  function busyFor(date: string): Interval[] {
    const intervals: Interval[] = []
    for (const appointment of appointments.value) {
      const interval = appointmentToBusyInterval(appointment, date, options.timeZone.value)
      if (interval) intervals.push(interval)
    }
    for (const block of timeBlocksQuery.data.value ?? []) {
      const interval = timeBlockToBusyInterval(block, date, options.timeZone.value)
      if (interval) intervals.push(interval)
    }
    return intervals
  }

  /** Earliest bookable minute: "now" on today, nothing before working start otherwise. */
  function earliestFor(date: string, workStart: number): number {
    return date === today.value ? Math.max(workStart, nowMinutes.value) : workStart
  }

  function dayState(date: string): DayState | null {
    if (!isLoaded(date)) return null
    return classifyDayState({
      schedule: options.schedule.value,
      date,
      busy: busyFor(date),
      stepMinutes: options.stepMinutes.value,
      durationMinutes: options.durationMinutes.value,
      nowMinutes: date === today.value ? nowMinutes.value : undefined,
    })
  }

  function daySlots(date: string): DaySlot[] {
    if (!isLoaded(date) || date < today.value) return []
    const window = resolveDayWindow(options.schedule.value, date)
    if (!window.enabled) return []
    return buildDaySlots({
      workStart: window.workStart,
      workEnd: window.workEnd,
      breaks: window.breaks,
      busy: busyFor(date),
      stepMinutes: options.stepMinutes.value,
      durationMinutes: options.durationMinutes.value,
      earliest: earliestFor(date, window.workStart),
    })
  }

  function dayOccupancy(date: string): DayOccupancy | null {
    if (!isLoaded(date)) return null
    const window = resolveDayWindow(options.schedule.value, date)
    if (!window.enabled) return null
    return {
      window,
      busy: mergeIntervals([...busyFor(date), ...window.breaks], window.workStart, window.workEnd),
    }
  }

  function dayTimeOffs(date: string): DayTimeOff[] {
    if (!isLoaded(date)) return []
    return (timeBlocksQuery.data.value ?? []).flatMap((block) => {
      const interval = timeBlockToBusyInterval(block, date, options.timeZone.value)
      if (!interval) return []
      const allDay = interval[0] === 0 && interval[1] === MINUTES_IN_DAY
      return [{ interval, allDay, notes: block.notes }]
    })
  }

  /** Whether `[start, start + duration)` overlaps a booking / time off / break. */
  function hasConflict(date: string, start: number): boolean {
    const duration = Math.max(options.durationMinutes.value, 1)
    const candidate: Interval = [start, start + duration]
    const window = resolveDayWindow(options.schedule.value, date)
    return [...busyFor(date), ...window.breaks].some((interval) =>
      intervalsOverlap(candidate, interval),
    )
  }

  return {
    today,
    nowMinutes,
    isLoading,
    isLoaded,
    dayState,
    daySlots,
    dayOccupancy,
    dayTimeOffs,
    hasConflict,
  }
}

export type AppointmentAvailability = ReturnType<typeof useAppointmentAvailability>
