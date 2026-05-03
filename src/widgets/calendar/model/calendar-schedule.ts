import type { BusinessHoursInput, EventInput } from '@fullcalendar/core'
import type {
  MasterSchedule,
  MasterScheduleBreak,
  MasterScheduleDay,
  MasterScheduleDayKey,
} from '@entities/master'

const DAY_KEYS: MasterScheduleDayKey[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

const MINUTES_PER_DAY = 24 * 60
const RANGE_PADDING_MINUTES = 2 * 60

export interface CalendarScheduleDisplay {
  slotMinTime?: string
  slotMaxTime?: string
  businessHours?: BusinessHoursInput
  backgroundEvents: EventInput[]
}

interface NormalizedScheduleDay {
  dayOfWeek: number
  startMinutes: number
  endMinutes: number
  breaks: NormalizedScheduleBreak[]
}

interface NormalizedScheduleBreak {
  startMinutes: number
  endMinutes: number
}

export function buildCalendarScheduleDisplay(
  schedule: MasterSchedule | null | undefined,
): CalendarScheduleDisplay {
  const days = normalizeScheduleDays(schedule)

  if (!days.length) {
    return { backgroundEvents: [] }
  }

  return {
    slotMinTime: formatSlotTime(
      Math.max(0, Math.min(...days.map((day) => day.startMinutes)) - RANGE_PADDING_MINUTES),
    ),
    slotMaxTime: formatSlotTime(
      Math.min(
        MINUTES_PER_DAY,
        Math.max(...days.map((day) => day.endMinutes)) + RANGE_PADDING_MINUTES,
      ),
    ),
    businessHours: days.map((day) => ({
      daysOfWeek: [day.dayOfWeek],
      startTime: formatSlotTime(day.startMinutes),
      endTime: formatSlotTime(day.endMinutes),
    })),
    backgroundEvents: buildBreakBackgroundEvents(days),
  }
}

export function isCalendarScheduleBreakSlot(
  schedule: MasterSchedule | null | undefined,
  dayOfWeek: number,
  minutes: number,
): boolean {
  const day = normalizeScheduleDays(schedule).find(
    (scheduleDay) => scheduleDay.dayOfWeek === dayOfWeek,
  )
  if (!day) return false

  return day.breaks.some(
    (breakTime) => minutes >= breakTime.startMinutes && minutes < breakTime.endMinutes,
  )
}

function normalizeScheduleDays(
  schedule: MasterSchedule | null | undefined,
): NormalizedScheduleDay[] {
  const rawDays = schedule?.days
  if (!rawDays || typeof rawDays !== 'object') return []

  return DAY_KEYS.map((dayKey, dayOfWeek) =>
    normalizeScheduleDay(dayOfWeek, rawDays[dayKey] ?? undefined),
  ).filter((day): day is NormalizedScheduleDay => Boolean(day))
}

function normalizeScheduleDay(
  dayOfWeek: number,
  day: Partial<MasterScheduleDay> | null | undefined,
): NormalizedScheduleDay | null {
  if (!day?.enabled) return null

  const startMinutes = parseTimeToMinutes(day.start)
  const endMinutes = parseTimeToMinutes(day.end)

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return null
  }

  return {
    dayOfWeek,
    startMinutes,
    endMinutes,
    breaks: normalizeScheduleBreaks(day.breaks, startMinutes, endMinutes),
  }
}

function normalizeScheduleBreaks(
  breaks: MasterScheduleBreak[] | undefined,
  workStartMinutes: number,
  workEndMinutes: number,
): NormalizedScheduleBreak[] {
  if (!Array.isArray(breaks)) return []

  return breaks
    .map((breakTime) => ({
      startMinutes: parseTimeToMinutes(breakTime.start),
      endMinutes: parseTimeToMinutes(breakTime.end),
    }))
    .filter(
      (breakTime): breakTime is NormalizedScheduleBreak =>
        breakTime.startMinutes !== null &&
        breakTime.endMinutes !== null &&
        breakTime.endMinutes > breakTime.startMinutes &&
        breakTime.startMinutes < workEndMinutes &&
        breakTime.endMinutes > workStartMinutes,
    )
    .map((breakTime) => ({
      startMinutes: Math.max(workStartMinutes, breakTime.startMinutes),
      endMinutes: Math.min(workEndMinutes, breakTime.endMinutes),
    }))
}

function buildBreakBackgroundEvents(days: NormalizedScheduleDay[]): EventInput[] {
  return days.flatMap((day) =>
    day.breaks.map((breakTime, index) => ({
      id: `schedule-break-${day.dayOfWeek}-${index}`,
      daysOfWeek: [day.dayOfWeek],
      startTime: formatSlotTime(breakTime.startMinutes),
      endTime: formatSlotTime(breakTime.endMinutes),
      display: 'background',
      classNames: ['fc-schedule-break'],
      overlap: false,
    })),
  )
}

function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (typeof value !== 'string') return null

  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim())
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3] ?? 0)

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    !Number.isInteger(seconds) ||
    hours < 0 ||
    hours > 24 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59 ||
    (hours === 24 && (minutes > 0 || seconds > 0))
  ) {
    return null
  }

  return hours * 60 + minutes
}

function formatSlotTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60

  return `${padTimePart(hours)}:${padTimePart(remainder)}:00`
}

function padTimePart(value: number): string {
  return String(value).padStart(2, '0')
}
