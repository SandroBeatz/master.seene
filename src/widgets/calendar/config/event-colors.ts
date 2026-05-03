import { APPOINTMENT_STATUS_VIEW } from '@entities/appointment'

export interface CalendarEventColorSet {
  borderColor: string
  backgroundColor: string
  textColor: string
}

export type CalendarEventStatusColorSet = Omit<CalendarEventColorSet, 'textColor'>

export const CALENDAR_EVENT_TEXT_COLOR = '#1e293b'
export const CALENDAR_CONFIRMED_FALLBACK_COLOR =
  APPOINTMENT_STATUS_VIEW.confirmed.calendar.borderColor

export const CALENDAR_STATUS_COLORS = Object.fromEntries(
  Object.entries(APPOINTMENT_STATUS_VIEW).map(([status, config]) => [status, config.calendar]),
) as Record<keyof typeof APPOINTMENT_STATUS_VIEW, CalendarEventStatusColorSet>
