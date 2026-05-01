import type { AppointmentStatus } from '@entities/appointment'

export interface CalendarEventColorSet {
  borderColor: string
  backgroundColor: string
  textColor: string
}

export type CalendarEventStatusColorSet = Omit<CalendarEventColorSet, 'textColor'>

export const CALENDAR_EVENT_TEXT_COLOR = '#1e293b'
export const CALENDAR_CONFIRMED_FALLBACK_COLOR = '#a78bfa'

export const CALENDAR_FALLBACK_STATUS_COLORS: CalendarEventStatusColorSet = {
  borderColor: '#94a3b8',
  backgroundColor: '#f8fafc',
}

export const CALENDAR_STATUS_COLORS: Partial<
  Record<AppointmentStatus, CalendarEventStatusColorSet>
> = {
  pending: { borderColor: '#f97316', backgroundColor: '#fff7ed' },
  completed: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
  cancelled: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  no_show: CALENDAR_FALLBACK_STATUS_COLORS,
}
