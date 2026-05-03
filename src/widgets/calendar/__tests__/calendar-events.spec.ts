import { describe, expect, it } from 'vitest'
import type { Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'
import type { Service } from '@entities/service'
import type { TimeBlock } from '@entities/time-block'
import { buildCalendarEvents } from '../model/calendar-events'

const baseAppointment: Appointment = {
  id: 'appointment-1',
  user_id: 'user-1',
  client_id: 'client-1',
  service_ids: ['service-1'],
  start_at: '2026-05-01T10:00:00.000Z',
  duration: 45,
  price: null,
  status: 'confirmed',
  notes: null,
  created_at: '2026-05-01T09:00:00.000Z',
  updated_at: '2026-05-01T09:00:00.000Z',
}

const clients: Client[] = [
  {
    id: 'client-1',
    user_id: 'user-1',
    phone: '+10000000000',
    first_name: 'Anna',
    last_name: 'Smith',
    email: null,
    birthday: null,
    notes: null,
    source: 'manual',
    created_at: '2026-05-01T09:00:00.000Z',
    updated_at: '2026-05-01T09:00:00.000Z',
  },
]

const services: Service[] = [
  {
    id: 'service-1',
    user_id: 'user-1',
    category_id: null,
    name: 'Haircut',
    description: null,
    duration: 45,
    price: 50,
    color: '#2563eb',
    is_active: true,
    sort_order: 0,
    created_at: '2026-05-01T09:00:00.000Z',
    updated_at: '2026-05-01T09:00:00.000Z',
  },
]

const baseTimeBlock: TimeBlock = {
  id: 'time-block-1',
  user_id: 'user-1',
  start_at: '2026-05-02T12:00:00.000Z',
  end_at: '2026-05-02T13:30:00.000Z',
  all_day: false,
  notes: null,
  created_at: '2026-05-01T09:00:00.000Z',
  updated_at: '2026-05-01T09:00:00.000Z',
}

describe('buildCalendarEvents', () => {
  it('maps appointment, client, service and confirmed service color to a calendar event', () => {
    const [event] = buildCalendarEvents({
      appointments: [baseAppointment],
      clients,
      services,
      unknownClientLabel: 'Unknown client',
      timeBlockLabel: 'Blocked time',
      timeZone: 'UTC',
    })

    expect(event).toMatchObject({
      id: 'appointment-1',
      start: '2026-05-01T10:00:00',
      end: '2026-05-01T10:45:00',
      title: 'Anna Smith — Haircut',
      borderColor: '#2563eb',
      backgroundColor: '#2563eb33',
      textColor: '#1e293b',
      extendedProps: { appointment: baseAppointment },
    })
  })

  it('uses translated unknown client label and status colors when data is missing', () => {
    const [event] = buildCalendarEvents({
      appointments: [
        {
          ...baseAppointment,
          client_id: 'missing-client',
          service_ids: ['missing-service'],
          status: 'cancelled',
        },
      ],
      clients,
      services,
      unknownClientLabel: 'Client inconnu',
      timeBlockLabel: 'Temps bloqué',
      timeZone: 'UTC',
    })

    expect(event).toMatchObject({
      title: 'Client inconnu',
      borderColor: '#ef4444',
      backgroundColor: '#fef2f2',
      textColor: '#1e293b',
    })
  })

  it('maps blocked time as a separate calendar event type', () => {
    const event = buildCalendarEvents({
      appointments: [],
      timeBlocks: [baseTimeBlock],
      clients,
      services,
      unknownClientLabel: 'Unknown client',
      timeBlockLabel: 'Blocked time',
      timeZone: 'UTC',
    })[0]

    expect(event).toMatchObject({
      id: 'time-block-1',
      start: '2026-05-02T12:00:00',
      end: '2026-05-02T13:30:00',
      allDay: false,
      title: 'Blocked time',
      borderColor: '#64748b',
      backgroundColor: '#f1f5f9',
      textColor: '#334155',
      extendedProps: { type: 'time-block', timeBlock: baseTimeBlock },
    })
  })

  it('keeps all-day blocked time and uses notes as the event title', () => {
    const timeBlock = {
      ...baseTimeBlock,
      all_day: true,
      notes: 'Vacation',
    }

    const event = buildCalendarEvents({
      appointments: [],
      timeBlocks: [timeBlock],
      clients,
      services,
      unknownClientLabel: 'Unknown client',
      timeBlockLabel: 'Blocked time',
      timeZone: 'UTC',
    })[0]

    expect(event).toMatchObject({
      allDay: true,
      title: 'Vacation',
      extendedProps: { type: 'time-block', timeBlock },
    })
  })

  it('maps appointment UTC instants to selected timezone wall time for FullCalendar', () => {
    const [event] = buildCalendarEvents({
      appointments: [
        {
          ...baseAppointment,
          start_at: '2026-05-01T02:00:00.000Z',
          duration: 60,
        },
      ],
      clients,
      services,
      unknownClientLabel: 'Unknown client',
      timeBlockLabel: 'Blocked time',
      timeZone: 'Asia/Bishkek',
    })

    expect(event).toMatchObject({
      start: '2026-05-01T08:00:00',
      end: '2026-05-01T09:00:00',
    })
  })
})
