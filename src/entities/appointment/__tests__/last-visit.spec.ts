import { describe, expect, it } from 'vitest'
import { lastVisitDate, type Appointment, type AppointmentStatus } from '@entities/appointment'

const NOW = new Date('2026-07-12T12:00:00.000Z')

function makeAppointment(
  overrides: Partial<Appointment> & Pick<Appointment, 'start_at'>,
): Appointment {
  return {
    id: 'a1',
    user_id: 'u1',
    client_id: 'c1',
    service_ids: ['s1'],
    duration: 60,
    price: null,
    status: 'completed',
    source: 'manual',
    notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('lastVisitDate', () => {
  it('returns null when there are no appointments', () => {
    expect(lastVisitDate([], NOW)).toBeNull()
  })

  it('returns the most recent past visit', () => {
    const appts = [
      makeAppointment({ start_at: '2026-05-01T09:00:00.000Z' }),
      makeAppointment({ start_at: '2026-06-20T09:00:00.000Z' }),
      makeAppointment({ start_at: '2026-03-10T09:00:00.000Z' }),
    ]
    expect(lastVisitDate(appts, NOW)).toBe('2026-06-20T09:00:00.000Z')
  })

  it('ignores future appointments', () => {
    const appts = [
      makeAppointment({ start_at: '2026-05-01T09:00:00.000Z' }),
      makeAppointment({ start_at: '2026-08-01T09:00:00.000Z' }),
    ]
    expect(lastVisitDate(appts, NOW)).toBe('2026-05-01T09:00:00.000Z')
  })

  it('ignores an appointment still in progress (end in the future)', () => {
    // starts before now but ends after now
    const appts = [makeAppointment({ start_at: '2026-07-12T11:30:00.000Z', duration: 60 })]
    expect(lastVisitDate(appts, NOW)).toBeNull()
  })

  it('ignores cancelled, no-show, expired and pending statuses', () => {
    const skipped: AppointmentStatus[] = ['cancelled', 'no_show', 'expired', 'pending']
    const appts = skipped.map((status) =>
      makeAppointment({ start_at: '2026-05-01T09:00:00.000Z', status }),
    )
    expect(lastVisitDate(appts, NOW)).toBeNull()
  })

  it('counts confirmed past appointments as a visit', () => {
    const appts = [makeAppointment({ start_at: '2026-05-01T09:00:00.000Z', status: 'confirmed' })]
    expect(lastVisitDate(appts, NOW)).toBe('2026-05-01T09:00:00.000Z')
  })
})
