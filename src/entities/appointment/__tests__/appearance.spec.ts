import { describe, expect, it } from 'vitest'
import {
  APPOINTMENT_STATUS_VIEW,
  getAppointmentAccentColor,
  getAppointmentServiceColors,
  getAppointmentStatusIcon,
  isGroupAppointment,
  type Appointment,
  type AppointmentStatus,
  type ServiceColorRef,
} from '@entities/appointment'

function makeAppointment(serviceIds: string[]): Appointment {
  return {
    id: 'a1',
    user_id: 'u1',
    client_id: 'c1',
    service_ids: serviceIds,
    start_at: '2026-06-14T09:00:00.000Z',
    duration: 60,
    price: null,
    status: 'confirmed',
    source: 'manual',
    notes: null,
    created_at: '2026-06-14T00:00:00.000Z',
    updated_at: '2026-06-14T00:00:00.000Z',
  }
}

const serviceMap = new Map<string, ServiceColorRef>([
  ['s1', { color: '#ff0000' }],
  ['s2', { color: '#00ff00' }],
  ['s3', { color: '' }], // service without a color
])

describe('isGroupAppointment', () => {
  it('is false for a single service', () => {
    expect(isGroupAppointment(makeAppointment(['s1']))).toBe(false)
  })

  it('is false for an empty service list', () => {
    expect(isGroupAppointment(makeAppointment([]))).toBe(false)
  })

  it('is true for two or more services', () => {
    expect(isGroupAppointment(makeAppointment(['s1', 's2']))).toBe(true)
  })
})

describe('getAppointmentServiceColors', () => {
  it('returns colors in service_ids order', () => {
    expect(getAppointmentServiceColors(makeAppointment(['s2', 's1']), serviceMap)).toEqual([
      '#00ff00',
      '#ff0000',
    ])
  })

  it('skips services that are missing from the map or have no color', () => {
    expect(
      getAppointmentServiceColors(makeAppointment(['s1', 'unknown', 's3']), serviceMap),
    ).toEqual(['#ff0000'])
  })

  it('returns an empty array for an empty service list', () => {
    expect(getAppointmentServiceColors(makeAppointment([]), serviceMap)).toEqual([])
  })
})

describe('getAppointmentAccentColor', () => {
  it('returns the single service color', () => {
    expect(getAppointmentAccentColor(makeAppointment(['s1']), serviceMap)).toBe('#ff0000')
  })

  it('returns null for a group appointment (grey fallback)', () => {
    expect(getAppointmentAccentColor(makeAppointment(['s1', 's2']), serviceMap)).toBeNull()
  })

  it('returns null when the single service has no resolvable color', () => {
    expect(getAppointmentAccentColor(makeAppointment(['s3']), serviceMap)).toBeNull()
    expect(getAppointmentAccentColor(makeAppointment(['unknown']), serviceMap)).toBeNull()
  })
})

describe('getAppointmentStatusIcon', () => {
  it('returns the configured icon for every status', () => {
    const statuses: AppointmentStatus[] = [
      'pending',
      'confirmed',
      'completed',
      'cancelled',
      'no_show',
      'expired',
    ]
    for (const status of statuses) {
      expect(getAppointmentStatusIcon(status)).toBe(APPOINTMENT_STATUS_VIEW[status].icon)
    }
  })
})
