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
  first_name: string
  last_name: string
  username: string
  specializations: string[]
  bio: string | null
  schedule: MasterSchedule | null
  // Contact & social channels (Settings → Contacts & social).
  phone: string
  whatsapp: string | null
  telegram: string | null
  instagram: string | null
  tiktok: string | null
  contact_email: string | null
  // Studio / address.
  country: string
  address: string | null
  house_number: string | null
  zip_code: string | null
  city: string | null
  place_id: string | null
  works_at_place: boolean
  can_travel: boolean
}

/** Fields editable from the Profile settings form. */
export interface MasterProfileUpdate {
  first_name: string
  last_name: string
  username: string
  specializations: string[]
  bio: string | null
}

/** Fields editable from the Contacts & social settings form. */
export interface MasterContactsUpdate {
  phone: string
  whatsapp: string | null
  telegram: string | null
  instagram: string | null
  tiktok: string | null
  contact_email: string | null
  country: string
  address: string | null
  house_number: string | null
  zip_code: string | null
  city: string | null
  place_id: string | null
  works_at_place: boolean
  can_travel: boolean
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
