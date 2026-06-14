import { computed, ref, type Ref } from 'vue'
import type { AppointmentDateRange } from '@entities/appointment'
import { useAppointmentsQuery } from '@entities/appointment'
import { useClientsQuery } from '@entities/client'
import { useServicesQuery } from '@entities/service'
import { useTimeBlocksQuery } from '@entities/time-block'
import { buildCalendarEvents } from './calendar-events'

export function useCalendarEvents(
  userId: Ref<string>,
  unknownClientLabel: Ref<string>,
  timeBlockLabel: Ref<string>,
  timeZone: Ref<string>,
) {
  const dateRange = ref<AppointmentDateRange>(createInitialAppointmentDateRange())

  const { data: appointments, isPending } = useAppointmentsQuery(userId, dateRange)
  const { data: timeBlocks } = useTimeBlocksQuery(userId, dateRange)
  const { data: clients } = useClientsQuery(userId)
  const { data: services } = useServicesQuery(userId)

  // Empty == no real appointments in the visible range (time-blocks and the
  // background schedule don't count as "scheduled work").
  const isEmpty = computed(() => (appointments.value?.length ?? 0) === 0)

  const calendarEvents = computed(() =>
    buildCalendarEvents({
      appointments: appointments.value,
      timeBlocks: timeBlocks.value,
      clients: clients.value,
      services: services.value,
      unknownClientLabel: unknownClientLabel.value,
      timeBlockLabel: timeBlockLabel.value,
      timeZone: timeZone.value,
    }),
  )

  function onDatesSet(range: AppointmentDateRange) {
    dateRange.value = { from: range.from, to: range.to }
  }

  return {
    calendarEvents,
    dateRange,
    onDatesSet,
    isPending,
    isEmpty,
  }
}

export function createInitialAppointmentDateRange(
  referenceDate = new Date(),
): AppointmentDateRange {
  return {
    from: new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1).toISOString(),
    to: new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 2, 0).toISOString(),
  }
}
