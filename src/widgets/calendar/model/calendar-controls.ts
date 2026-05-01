export const CALENDAR_VIEW_TYPES = ['dayGridMonth', 'timeGridWeek', 'timeGridDay'] as const

export type CalendarViewType = (typeof CALENDAR_VIEW_TYPES)[number]

export interface CalendarDateRange {
  from: string
  to: string
  currentFrom: string
  currentTo: string
  title: string
  viewType: CalendarViewType
}

export interface CalendarWidgetExpose {
  moveToPrevious: () => void
  moveToNext: () => void
  moveToToday: () => void
  changeView: (viewType: CalendarViewType) => void
}

export function normalizeCalendarViewType(viewType: string): CalendarViewType {
  return isCalendarViewType(viewType) ? viewType : 'timeGridWeek'
}

function isCalendarViewType(viewType: string): viewType is CalendarViewType {
  return CALENDAR_VIEW_TYPES.includes(viewType as CalendarViewType)
}
