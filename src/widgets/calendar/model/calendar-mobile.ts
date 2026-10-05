import type { EventInput } from '@fullcalendar/core'
import { CALENDAR_VIEW_TYPES, type CalendarViewType } from './calendar-controls'

/** Vertical scale of the mobile time grid — one hour of the day in pixels. */
export const MOBILE_CALENDAR_HOUR_HEIGHT_PX = 80

/** Fixed day column width in the mobile week view (horizontally scrollable). */
export const MOBILE_CALENDAR_WEEK_DAY_WIDTH_PX = 200

export const MOBILE_CALENDAR_DEFAULT_VIEW: CalendarViewType = 'dayGridMonth'

const MINUTES_PER_DAY = 24 * 60
const MICRO_EVENT_MAX_PX = 30
const COMPACT_EVENT_MAX_PX = 54
const VIEW_STORAGE_KEY = 'seene:mobile-calendar:view'

export type MobileCalendarEventDensity = 'full' | 'compact' | 'micro'

/** Height of one FullCalendar slot row for the master's slot step. */
export function getMobileCalendarSlotHeight(slotStepMinutes: number): number {
  return Math.round((MOBILE_CALENDAR_HOUR_HEIGHT_PX * slotStepMinutes) / 60)
}

/**
 * Card layout that fits an event of the given duration in the time grid:
 * slivers get one line, short visits two, the rest the full card.
 */
export function getMobileCalendarEventDensity(durationMinutes: number): MobileCalendarEventDensity {
  const heightPx = (durationMinutes * MOBILE_CALENDAR_HOUR_HEIGHT_PX) / 60
  if (heightPx < MICRO_EVENT_MAX_PX) return 'micro'
  if (heightPx < COMPACT_EVENT_MAX_PX) return 'compact'
  return 'full'
}

export interface MobileTimeGridBounds {
  /** FullCalendar `slotMinTime` / `slotMaxTime` (HH:MM:SS). */
  slotMinTime: string
  slotMaxTime: string
}

/**
 * Visible hours of the time grid: the schedule window (already padded by
 * buildCalendarScheduleDisplay), widened to the hour so that no timed event in
 * the loaded range falls outside it. Without a schedule the whole day shows.
 */
export function resolveMobileTimeGridBounds(
  schedule: { slotMinTime?: string; slotMaxTime?: string },
  events: readonly EventInput[],
): MobileTimeGridBounds {
  let minMinutes = parseSlotMinutes(schedule.slotMinTime) ?? 0
  let maxMinutes = parseSlotMinutes(schedule.slotMaxTime) ?? MINUTES_PER_DAY

  for (const event of events) {
    if (event.allDay || event.display === 'background') continue
    const start = getWallClockMinutes(event.start)
    const end = getWallClockMinutes(event.end)
    if (start !== null) minMinutes = Math.min(minMinutes, Math.floor(start / 60) * 60)
    if (end !== null) {
      // An event ending exactly at midnight reads as 00:00 of the next day.
      const endMinutes = end === 0 ? MINUTES_PER_DAY : end
      maxMinutes = Math.max(maxMinutes, Math.ceil(endMinutes / 60) * 60)
    }
  }

  return {
    slotMinTime: formatSlotTime(Math.max(0, minMinutes)),
    slotMaxTime: formatSlotTime(Math.min(MINUTES_PER_DAY, maxMinutes)),
  }
}

/**
 * Where the time grid opens vertically: an hour before "now" while today is on
 * screen (what's next matters most), otherwise the start of the working day.
 * Whole hours (a slot row exists for every step), clamped into the grid.
 */
export function getMobileCalendarScrollTime(options: {
  bounds: MobileTimeGridBounds
  workdayStart?: string
  /** Minutes since midnight now, when today is inside the visible range. */
  nowMinutes?: number
}): string {
  const min = parseSlotMinutes(options.bounds.slotMinTime) ?? 0
  const max = parseSlotMinutes(options.bounds.slotMaxTime) ?? MINUTES_PER_DAY
  const target =
    options.nowMinutes !== undefined
      ? options.nowMinutes - 60
      : (parseSlotMinutes(options.workdayStart) ?? min) - 30

  const hour = Math.floor(Math.max(min, Math.min(target, max - 60)) / 60) * 60
  return formatSlotTime(Math.max(min, hour))
}

/** Earliest working-day start among FullCalendar business-hours entries. */
export function getWorkdayStart(businessHours: readonly object[] | undefined): string | undefined {
  const starts = (businessHours ?? [])
    .map((entry) => (entry as { startTime?: unknown }).startTime)
    .filter((value): value is string => typeof value === 'string')
    .sort()
  return starts[0]
}

/**
 * Query window for a visible range, widened to whole calendar months (in UTC
 * terms, with a day of slack each side for zone offsets). Paging days or
 * weeks inside a month then reuses one cached query instead of refetching.
 */
export function toMonthAlignedRange<T extends { from?: string; to?: string }>(range: T): T {
  if (!range.from || !range.to) return range
  const from = new Date(range.from)
  const to = new Date(range.to)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return range

  return {
    ...range,
    from: new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 0)).toISOString(),
    to: new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() + 1, 2)).toISOString(),
  }
}

/** Last calendar view the master picked on this device (month by default). */
export function readStoredMobileCalendarView(): CalendarViewType {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY)
    return CALENDAR_VIEW_TYPES.find((view) => view === stored) ?? MOBILE_CALENDAR_DEFAULT_VIEW
  } catch {
    return MOBILE_CALENDAR_DEFAULT_VIEW
  }
}

export function storeMobileCalendarView(view: CalendarViewType): void {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view)
  } catch {
    // Storage can be unavailable (private mode) — remembering is a nicety.
  }
}

function parseSlotMinutes(value: string | undefined): number | null {
  const match = value ? /^(\d{1,2}):(\d{2})/.exec(value) : null
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

function getWallClockMinutes(value: EventInput['start']): number | null {
  if (typeof value !== 'string') return null
  const match = /T(\d{2}):(\d{2})/.exec(value)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

function formatSlotTime(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0')
  const rest = String(minutes % 60).padStart(2, '0')
  return `${hours}:${rest}:00`
}
