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
  source: 'manual',
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
    emoji: null,
    is_favorite: false,
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
  it('maps a single-service appointment to the service color and a status icon', () => {
    const [event] = buildCalendarEvents({
      appointments: [baseAppointment],
      clients,
      services,
      unknownClientLabel: 'Unknown client',
      timeBlockLabel: 'Blocked time',
      timeZone: 'UTC',
      now: new Date('2026-05-01T08:00:00.000Z'), // before the appointment → confirmed
    })

    expect(event).toMatchObject({
      id: 'appointment-1',
      start: '2026-05-01T10:00:00',
      end: '2026-05-01T10:45:00',
      title: 'Anna Smith — Haircut',
      borderColor: '#2563eb',
      backgroundColor: 'color-mix(in srgb, #2563eb 14%, white)',
      textColor: '#1e293b',
      extendedProps: {
        appointment: baseAppointment,
        statusIcon: 'i-lucide-clock-check',
        clientName: 'Anna Smith',
        isGroup: false,
        isOnline: false,
        serviceList: [{ name: 'Haircut', color: '#2563eb' }],
      },
    })
  })

  it('flags online-booking appointments via the isOnline extended prop', () => {
    const [event] = buildCalendarEvents({
      appointments: [{ ...baseAppointment, source: 'online_booking' }],
      clients,
      services,
      unknownClientLabel: 'Unknown client',
      timeBlockLabel: 'Blocked time',
      timeZone: 'UTC',
    })

    expect(event).toMatchObject({ extendedProps: { isOnline: true } })
  })

  it('uses the translated unknown client label and neutral color when data is missing', () => {
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
      borderColor: '#94a3b8',
      backgroundColor: '#f1f5f9',
      textColor: '#1e293b',
    })
  })

  it('derives the effective status icon from the current time', () => {
    // start 10:00, duration 45m → window 10:00–10:45.
    const during = buildCalendarEvents({
      appointments: [baseAppointment],
      clients,
      services,
      timeZone: 'UTC',
      unknownClientLabel: 'Unknown client',
      timeBlockLabel: 'Blocked time',
      now: new Date('2026-05-01T10:20:00.000Z'), // inside the window → ongoing
    })
    expect(during[0]).toMatchObject({
      extendedProps: { statusIcon: 'i-lucide-clock-fading' },
    })

    const after = buildCalendarEvents({
      appointments: [baseAppointment],
      clients,
      services,
      timeZone: 'UTC',
      unknownClientLabel: 'Unknown client',
      timeBlockLabel: 'Blocked time',
      now: new Date('2026-05-01T12:00:00.000Z'), // confirmed + past end → past
    })
    expect(after[0]).toMatchObject({
      extendedProps: { statusIcon: 'i-lucide-check' },
    })
  })

  it('colors by service regardless of status (no_show keeps the service color)', () => {
    const [event] = buildCalendarEvents({
      appointments: [{ ...baseAppointment, status: 'no_show' }],
      clients,
      services,
      unknownClientLabel: 'Unknown client',
      timeBlockLabel: 'Blocked time',
      timeZone: 'UTC',
    })

    expect(event).toMatchObject({
      borderColor: '#2563eb',
      backgroundColor: 'color-mix(in srgb, #2563eb 14%, white)',
      textColor: '#1e293b',
      extendedProps: { statusIcon: 'i-lucide-user-x' },
    })
  })

  it('maps a group appointment (2+ services) to the neutral color', () => {
    const [event] = buildCalendarEvents({
      appointments: [{ ...baseAppointment, service_ids: ['service-1', 'service-2'] }],
      clients,
      services: [
        ...services,
        { ...services[0]!, id: 'service-2', name: 'Color', color: '#16a34a' },
      ],
      unknownClientLabel: 'Unknown client',
      timeBlockLabel: 'Blocked time',
      timeZone: 'UTC',
    })

    expect(event).toMatchObject({
      borderColor: '#94a3b8',
      backgroundColor: '#f1f5f9',
      textColor: '#1e293b',
      extendedProps: {
        isGroup: true,
        serviceList: [
          { name: 'Haircut', color: '#2563eb' },
          { name: 'Color', color: '#16a34a' },
        ],
      },
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
