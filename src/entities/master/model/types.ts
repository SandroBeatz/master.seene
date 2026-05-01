export type TimeFormat = 12 | 24

export interface MasterSchedule {
  timezone?: string | null
  days?: unknown
}

export interface MasterProfile {
  id: string
  user_id: string
  schedule: MasterSchedule | null
}

export interface MasterSettings {
  user_id: string
  time_format: TimeFormat
}

export interface MasterPreferences {
  profile: MasterProfile | null
  settings: MasterSettings
  timeFormat: TimeFormat
  timeZone: string
}
