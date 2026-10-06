import { computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  isScheduleVisibleAppointment,
  useAppointmentsQuery,
  type Appointment,
  type AppointmentDateRange,
} from '@entities/appointment'
import { useClientsQuery } from '@entities/client/index.mobile'
import { useMasterPreferencesStore } from '@entities/master'
import { useServicesQuery } from '@entities/service/index.mobile'
import { useSessionStore } from '@entities/session'
import { useTimeBlocksQuery, type TimeBlock } from '@entities/time-block'
import { useNowMinute } from '@shared/lib/now'
import { buildCalendarEvents } from './calendar-events'
import { toMonthAlignedRange } from './calendar-mobile'
import { createInitialAppointmentDateRange } from './use-calendar-events'

/**
 * Calendar events for the Ionic build. Same event model as the desktop
 * `useCalendarEvents`, but imports only mobile-safe barrels, hides cancelled /
 * no-show visits (like the home timeline) and queries padded whole months so
 * paging stays on cached data. While a new window loads, the previous one keeps
 * showing — it overlaps the period being swiped to, so nothing blinks empty.
 */
export function useMobileCalendarEvents() {
  const { t } = useI18n()
  const sessionStore = useSessionStore()
  const masterStore = useMasterPreferencesStore()
  const userId = computed(() => sessionStore.session?.user.id ?? '')
  const queryRange = ref<AppointmentDateRange>(
    toMonthAlignedRange(createInitialAppointmentDateRange()),
  )

  const appointmentQuery = useAppointmentsQuery(userId, queryRange)
  const timeBlockQuery = useTimeBlocksQuery(userId, queryRange)
  const { data: clients } = useClientsQuery(userId)
  const { data: services } = useServicesQuery(userId)
  // Ticks each minute so effective status icons (ongoing → past) stay current.
  const now = useNowMinute()

  const lastAppointments = shallowRef<Appointment[]>([])
  const lastTimeBlocks = shallowRef<TimeBlock[]>([])
  watch(appointmentQuery.data, (data) => data && (lastAppointments.value = data))
  watch(timeBlockQuery.data, (data) => data && (lastTimeBlocks.value = data))

  const events = computed(() =>
    buildCalendarEvents({
      appointments: (appointmentQuery.data.value ?? lastAppointments.value).filter(
        isScheduleVisibleAppointment,
      ),
      timeBlocks: timeBlockQuery.data.value ?? lastTimeBlocks.value,
      clients: clients.value,
      services: services.value,
      unknownClientLabel: t('appointments.unknownClient'),
      timeBlockLabel: t('timeBlocks.calendarTitle'),
      timeZone: masterStore.timeZone,
      now: now.value,
    }),
  )
  const isLoading = computed(
    () => appointmentQuery.isLoading.value || timeBlockQuery.isLoading.value,
  )
  const error = computed(() => appointmentQuery.error.value ?? timeBlockQuery.error.value)

  function setVisibleRange(range: { from: string; to: string }) {
    const next = toMonthAlignedRange({ from: range.from, to: range.to })
    if (next.from === queryRange.value.from && next.to === queryRange.value.to) return
    queryRange.value = next
  }

  function refetch() {
    return Promise.allSettled([appointmentQuery.refetch(), timeBlockQuery.refetch()])
  }

  return { events, now, isLoading, error, setVisibleRange, refetch }
}
