import { describe, expect, it } from 'vitest'
import {
  APPOINTMENT_STATUS_VIEW,
  EFFECTIVE_APPOINTMENT_STATUS_VIEW,
  getAppointmentAccentColor,
  getAppointmentServiceColors,
  getAppointmentStatusIcon,
  getEffectiveAppointmentStatus,
  getEffectiveAppointmentStatusIcon,
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

describe('getEffectiveAppointmentStatus', () => {
  // Window: 2026-06-14 09:00 → 10:00 UTC (duration 60m).
  const base = { start_at: '2026-06-14T09:00:00.000Z', duration: 60 } as const
  const before = new Date('2026-06-14T08:30:00.000Z')
  const during = new Date('2026-06-14T09:30:00.000Z')
  const after = new Date('2026-06-14T11:00:00.000Z')

  it('passes terminal statuses through regardless of time', () => {
    for (const status of ['completed', 'cancelled', 'no_show', 'expired'] as const) {
      expect(getEffectiveAppointmentStatus({ ...base, status }, during)).toBe(status)
      expect(getEffectiveAppointmentStatus({ ...base, status }, after)).toBe(status)
    }
  })

  it('returns the stored status for future appointments', () => {
    expect(getEffectiveAppointmentStatus({ ...base, status: 'pending' }, before)).toBe('pending')
    expect(getEffectiveAppointmentStatus({ ...base, status: 'confirmed' }, before)).toBe('confirmed')
  })

  it('returns ongoing while now is inside the window (pending or confirmed)', () => {
    expect(getEffectiveAppointmentStatus({ ...base, status: 'pending' }, during)).toBe('ongoing')
    expect(getEffectiveAppointmentStatus({ ...base, status: 'confirmed' }, during)).toBe('ongoing')
  })

  it('returns past only for a confirmed appointment whose end has passed', () => {
    expect(getEffectiveAppointmentStatus({ ...base, status: 'confirmed' }, after)).toBe('past')
  })

  it('keeps a passed pending appointment as pending', () => {
    expect(getEffectiveAppointmentStatus({ ...base, status: 'pending' }, after)).toBe('pending')
  })

  it('treats the exact end instant as no longer ongoing', () => {
    const end = new Date('2026-06-14T10:00:00.000Z')
    expect(getEffectiveAppointmentStatus({ ...base, status: 'confirmed' }, end)).toBe('past')
  })

  it('derives the matching icon', () => {
    expect(getEffectiveAppointmentStatusIcon({ ...base, status: 'confirmed' }, during)).toBe(
      EFFECTIVE_APPOINTMENT_STATUS_VIEW.ongoing.icon,
    )
    expect(getEffectiveAppointmentStatusIcon({ ...base, status: 'confirmed' }, after)).toBe(
      EFFECTIVE_APPOINTMENT_STATUS_VIEW.past.icon,
    )
  })
})
