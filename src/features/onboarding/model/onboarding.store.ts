import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

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

const WORKDAYS: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

const TWELVE_HOUR_COUNTRIES = new Set([
  'US',
  'CA',
  'AU',
  'NZ',
  'PH',
  'MY',
  'EG',
  'SA',
  'PK',
  'IN',
  'BD',
  'GH',
  'NG',
  'KE',
])

function detectTimeFormat(country: string): 12 | 24 {
  return TWELVE_HOUR_COUNTRIES.has(country.toUpperCase()) ? 12 : 24
}

function defaultSchedule(): ScheduleData {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const days = DAY_KEYS.reduce(
    (acc, day) => {
      const isWorkday = WORKDAYS.includes(day)
      acc[day] = {
        enabled: isWorkday,
        start: isWorkday ? '09:00' : null,
        end: isWorkday ? '18:00' : null,
        breaks: [],
      }
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
    country: '',
    address: '',
    houseNumber: '',
    zipCode: '',
    city: '',
    placeId: '',
    worksAtPlace: true,
    canTravel: false,
  })

  // Step 4
  const schedule = reactive<ScheduleData>(defaultSchedule())
  const timeFormat = ref<12 | 24>(24)

  function setSpecializations(value: string[]) {
    specializations.splice(0, specializations.length, ...value)
  }

  function setPersonal(data: Partial<typeof personal>) {
    Object.assign(personal, data)
  }

  function setLocation(data: Partial<typeof location>) {
    Object.assign(location, data)
    if (data.country) timeFormat.value = detectTimeFormat(data.country)
  }

  function setTimeFormat(format: 12 | 24) {
    timeFormat.value = format
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
      country: location.country,
      address: location.address || null,
      house_number: location.houseNumber || null,
      zip_code: location.zipCode || null,
      city: location.city || null,
      place_id: location.placeId || null,
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
    timeFormat,
    setSpecializations,
    setPersonal,
    setLocation,
    setTimeFormat,
    setSchedule,
    toMasterProfile,
  }
}, {
  persist: {
    storage: sessionStorage,
  },
})
