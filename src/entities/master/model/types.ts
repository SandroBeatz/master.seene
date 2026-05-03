export type TimeFormat = 12 | 24
export type CalendarFirstDay = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type MasterCalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'

export type MasterScheduleDayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface MasterScheduleBreak {
  start: string
  end: string
}

export interface MasterScheduleDay {
  enabled: boolean
  start: string | null
  end: string | null
  breaks: MasterScheduleBreak[]
}

export interface MasterSchedule {
  timezone?: string | null
  days?: Partial<Record<MasterScheduleDayKey, Partial<MasterScheduleDay> | null>> | null
}

export interface MasterProfile {
  id: string
  user_id: string
  schedule: MasterSchedule | null
}

export interface MasterSettings {
  user_id: string
  time_format: TimeFormat
  calendar_first_day: CalendarFirstDay
  calendar_slot_step_minutes: number
  default_calendar_view: MasterCalendarViewType
}

export interface MasterPreferences {
  profile: MasterProfile | null
  settings: MasterSettings
  timeFormat: TimeFormat
  timeZone: string
  calendarFirstDay: CalendarFirstDay
  calendarSlotStepMinutes: number
  defaultCalendarView: MasterCalendarViewType
}
