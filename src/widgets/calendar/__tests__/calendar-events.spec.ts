import { describe, expect, it } from 'vitest'
import type { Appointment } from '@entities/appointment'
import type { Client } from '@entities/client'
import type { Service } from '@entities/service'
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

describe('buildCalendarEvents', () => {
  it('maps appointment, client, service and confirmed service color to a calendar event', () => {
    const [event] = buildCalendarEvents({
      appointments: [baseAppointment],
      clients,
      services,
      unknownClientLabel: 'Unknown client',
    })

    expect(event).toMatchObject({
      id: 'appointment-1',
      start: '2026-05-01T10:00:00.000Z',
      end: '2026-05-01T10:45:00.000Z',
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
    })

    expect(event).toMatchObject({
      title: 'Client inconnu',
      borderColor: '#ef4444',
      backgroundColor: '#fef2f2',
      textColor: '#1e293b',
    })
  })
})
