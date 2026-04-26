import { defineStore } from 'pinia'
import { reactive } from 'vue'

export interface Break {
  start: string
  end: string
}

export interface DaySchedule {
  enabled: boolean
  start: string | null
  end: string | null
  breaks: Break[]
}

export type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface ScheduleData {
  timezone: string
  days: Record<DayKey, DaySchedule>
}

const DAY_KEYS: DayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

function defaultSchedule(): ScheduleData {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const days = DAY_KEYS.reduce(
    (acc, day) => {
      acc[day] = { enabled: false, start: null, end: null, breaks: [] }
      return acc
    },
    {} as Record<DayKey, DaySchedule>,
  )
  return { timezone, days }
}

export const useOnboardingStore = defineStore('onboarding', () => {
  // Step 1
  const specializations = reactive<string[]>([])

  // Step 2
  const personal = reactive({
    firstName: '',
    lastName: '',
    phone: '',
    username: '',
  })

  // Step 3
  const location = reactive({
    city: '',
    address: '',
    zipCode: '',
    floor: '',
    apartment: '',
    entranceCode: '',
    worksAtPlace: true,
    canTravel: false,
  })

  // Step 4
  const schedule = reactive<ScheduleData>(defaultSchedule())

  function setSpecializations(value: string[]) {
    specializations.splice(0, specializations.length, ...value)
  }

  function setPersonal(data: Partial<typeof personal>) {
    Object.assign(personal, data)
  }

  function setLocation(data: Partial<typeof location>) {
    Object.assign(location, data)
  }

  function setSchedule(data: ScheduleData) {
    Object.assign(schedule, data)
  }

  function toMasterProfile() {
    return {
      first_name: personal.firstName,
      last_name: personal.lastName,
      phone: personal.phone,
      username: personal.username,
      specializations: [...specializations],
      city: location.city,
      address: location.address,
      zip_code: location.zipCode,
      floor: location.floor || null,
      apartment: location.apartment || null,
      entrance_code: location.entranceCode || null,
      works_at_place: location.worksAtPlace,
      can_travel: location.canTravel,
      schedule: {
        timezone: schedule.timezone,
        days: schedule.days,
      },
    }
  }

  return {
    specializations,
    personal,
    location,
    schedule,
    setSpecializations,
    setPersonal,
    setLocation,
    setSchedule,
    toMasterProfile,
  }
})
