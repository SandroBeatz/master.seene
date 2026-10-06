import type { DatesSetArg } from '@fullcalendar/core'
import { DEFAULT_TIME_ZONE } from '@entities/master'
import { toUtcIsoFromCalendarDateString } from '@shared/lib/time-zone'
import { normalizeCalendarViewType, type CalendarDateRange } from './calendar-controls'

/** FullCalendar's `datesSet` payload as UTC ISO bounds in the master's zone. */
export function toCalendarDateRange(info: DatesSetArg, timeZone: string): CalendarDateRange {
  return {
    from: toUtcIsoFromCalendarDateString(info.startStr, timeZone),
    to: toUtcIsoFromCalendarDateString(info.endStr, timeZone),
    currentFrom: toUtcIsoFromCalendarDateString(
      getCalendarDateString(info.view.currentStart, timeZone),
      timeZone,
    ),
    currentTo: toUtcIsoFromCalendarDateString(
      getCalendarDateString(info.view.currentEnd, timeZone),
      timeZone,
    ),
    title: info.view.title,
    viewType: normalizeCalendarViewType(info.view.type),
  }
}

/**
 * Wall-clock `YYYY-MM-DDTHH:mm:ss` of a FullCalendar date. With a named time
 * zone (and no zone plugin) FullCalendar hands out UTC-coerced dates, so the
 * wall clock lives in the UTC fields; with "local" it lives in local fields.
 */
export function getCalendarDateString(date: Date, timeZone: string): string {
  const useUtcParts = timeZone !== DEFAULT_TIME_ZONE
  const parts = [
    useUtcParts ? date.getUTCFullYear() : date.getFullYear(),
    (useUtcParts ? date.getUTCMonth() : date.getMonth()) + 1,
    useUtcParts ? date.getUTCDate() : date.getDate(),
    useUtcParts ? date.getUTCHours() : date.getHours(),
    useUtcParts ? date.getUTCMinutes() : date.getMinutes(),
    useUtcParts ? date.getUTCSeconds() : date.getSeconds(),
  ].map((part) => String(part).padStart(2, '0'))

  return `${parts[0]}-${parts[1]}-${parts[2]}T${parts[3]}:${parts[4]}:${parts[5]}`
}
