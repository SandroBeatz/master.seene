import type { EventInput } from '@fullcalendar/core'
import type { Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'
import type { Service } from '@entities/service'
import type { TimeBlock } from '@entities/time-block'
import {
  getAppointmentAccentColor,
  getAppointmentStatusIcon,
  isGroupAppointment,
} from '@entities/appointment'
import { getCalendarDateTimeString } from '@shared/lib/time-zone'
import {
  CALENDAR_EVENT_TEXT_COLOR,
  CALENDAR_GROUP_NEUTRAL,
  type CalendarEventColorSet,
} from '../config/event-colors'

interface CalendarEventSources {
  appointments?: Appointment[]
  timeBlocks?: TimeBlock[]
  clients?: Client[]
  services?: Service[]
  unknownClientLabel: string
  timeBlockLabel: string
  timeZone?: string
}

interface CalendarServiceSummary {
  name: string
  color: string
}

export function buildCalendarEvents({
  appointments = [],
  timeBlocks = [],
  clients = [],
  services = [],
  unknownClientLabel,
  timeBlockLabel,
  timeZone,
}: CalendarEventSources): EventInput[] {
  const clientMap = createClientMap(clients)
  const serviceMap = createServiceMap(services)

  return [
    ...appointments.map((appointment) =>
      buildAppointmentCalendarEvent(
        appointment,
        clientMap,
        serviceMap,
        unknownClientLabel,
        timeZone,
      ),
    ),
    ...timeBlocks.map((timeBlock) =>
      buildTimeBlockCalendarEvent(timeBlock, timeBlockLabel, timeZone),
    ),
  ]
}

export function getAppointmentEventColors(
  appointment: Appointment,
  serviceMap: Map<string, CalendarServiceSummary>,
): CalendarEventColorSet {
  // Colour by service for every status (single → service colour; group of 2+ or
  // a colourless service → neutral grey). Status is shown by an icon, not colour.
  const accent = getAppointmentAccentColor(appointment, serviceMap)

  if (accent) {
    return {
      borderColor: accent,
      // Solid (non-transparent) pale tint of the service colour.
      backgroundColor: `color-mix(in srgb, ${accent} 14%, white)`,
      textColor: CALENDAR_EVENT_TEXT_COLOR,
    }
  }

  return {
    ...CALENDAR_GROUP_NEUTRAL,
    textColor: CALENDAR_EVENT_TEXT_COLOR,
  }
}

function buildAppointmentCalendarEvent(
  appointment: Appointment,
  clientMap: Map<string, string>,
  serviceMap: Map<string, CalendarServiceSummary>,
  unknownClientLabel: string,
  timeZone?: string,
): EventInput {
  const clientName = clientMap.get(appointment.client_id) ?? unknownClientLabel
  const serviceList = appointment.service_ids
    .map((id) => serviceMap.get(id))
    .filter((service): service is CalendarServiceSummary => Boolean(service))
    .map((service) => ({ name: service.name, color: service.color }))
  const serviceNames = serviceList.map((service) => service.name).join(', ')

  const startMs = new Date(appointment.start_at).getTime()
  const endMs = startMs + appointment.duration * 60 * 1000
  const { borderColor, backgroundColor, textColor } = getAppointmentEventColors(
    appointment,
    serviceMap,
  )

  return {
    id: appointment.id,
    start: getCalendarDateTimeString(appointment.start_at, timeZone),
    end: getCalendarDateTimeString(new Date(endMs), timeZone),
    title: serviceNames ? `${clientName} — ${serviceNames}` : clientName,
    borderColor,
    backgroundColor,
    textColor,
    extendedProps: {
      type: 'appointment',
      appointment,
      statusIcon: getAppointmentStatusIcon(appointment.status),
      clientName,
      serviceList,
      isGroup: isGroupAppointment(appointment),
      isOnline: appointment.source === 'online_booking',
    },
  }
}

function buildTimeBlockCalendarEvent(
  timeBlock: TimeBlock,
  fallbackTitle: string,
  timeZone?: string,
): EventInput {
  return {
    id: timeBlock.id,
    start: getCalendarDateTimeString(timeBlock.start_at, timeZone),
    end: getCalendarDateTimeString(timeBlock.end_at, timeZone),
    allDay: timeBlock.all_day,
    title: timeBlock.notes || fallbackTitle,
    borderColor: '#64748b',
    backgroundColor: '#f1f5f9',
    textColor: '#334155',
    editable: true,
    extendedProps: { type: 'time-block', timeBlock },
  }
}

function createClientMap(clients: Client[]): Map<string, string> {
  const map = new Map<string, string>()

  for (const client of clients) {
    map.set(client.id, [client.first_name, client.last_name].filter(Boolean).join(' '))
  }

  return map
}

function createServiceMap(services: Service[]): Map<string, CalendarServiceSummary> {
  const map = new Map<string, CalendarServiceSummary>()

  for (const service of services) {
    map.set(service.id, { name: service.name, color: service.color })
  }

  return map
}
