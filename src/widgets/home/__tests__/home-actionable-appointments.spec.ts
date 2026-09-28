import { describe, expect, it } from 'vitest'
import type { Appointment, AppointmentStatus } from '@entities/appointment'
import {
  groupHomeActionableAppointments,
  hasAppointmentSlotEnded,
  needsHomeActionWaitingAttention,
} from '../model/home-actionable-appointments'

const now = new Date('2026-06-08T12:00:00.000Z')

function appointment(
  id: string,
  startAt: string,
  status: AppointmentStatus,
  overrides: Partial<Appointment> = {},
): Appointment {
  return {
    id,
    user_id: 'user-1',
    client_id: 'client-1',
    service_ids: ['service-1'],
    start_at: startAt,
    duration: 60,
    price: 100,
    status,
    source: 'manual',
    notes: null,
    created_at: '2026-06-08T10:00:00.000Z',
    updated_at: '2026-06-08T10:00:00.000Z',
    ...overrides,
  }
}

describe('home actionable appointments model', () => {
  it('groups appointments in action priority order and sorts each group by start time', () => {
    const result = groupHomeActionableAppointments(
      [
        appointment('finish-later', '2026-06-08T10:00:00.000Z', 'confirmed'),
        appointment('request-later', '2026-06-08T15:00:00.000Z', 'pending'),
        appointment('decision-later', '2026-06-08T09:30:00.000Z', 'pending'),
        appointment('request-sooner', '2026-06-08T13:00:00.000Z', 'pending'),
        appointment('finish-sooner', '2026-06-08T08:00:00.000Z', 'confirmed'),
        appointment('decision-sooner', '2026-06-08T07:00:00.000Z', 'pending'),
      ],
      now,
    )

    expect(result.requests.map(({ id }) => id)).toEqual(['request-sooner', 'request-later'])
    expect(result.needsDecision.map(({ id }) => id)).toEqual(['decision-sooner', 'decision-later'])
    expect(result.toFinish.map(({ id }) => id)).toEqual(['finish-sooner', 'finish-later'])
    expect(result.ordered.map(({ id }) => id)).toEqual([
      'request-sooner',
      'request-later',
      'decision-sooner',
      'decision-later',
      'finish-sooner',
      'finish-later',
    ])
  })

  it('ignores terminal statuses and confirmed appointments whose slot has not ended', () => {
    const result = groupHomeActionableAppointments(
      [
        appointment('future-confirmed', '2026-06-08T13:00:00.000Z', 'confirmed'),
        appointment('completed', '2026-06-08T08:00:00.000Z', 'completed'),
        appointment('cancelled', '2026-06-08T08:00:00.000Z', 'cancelled'),
      ],
      now,
    )

    expect(result.ordered).toEqual([])
  })

  it('treats a slot ending exactly now as ended', () => {
    expect(
      hasAppointmentSlotEnded(appointment('boundary', '2026-06-08T11:00:00.000Z', 'pending'), now),
    ).toBe(true)
  })

  it('raises waiting attention only for online pending requests after 15 minutes', () => {
    const base = appointment('online', '2026-06-08T13:00:00.000Z', 'pending', {
      source: 'online_booking',
      created_at: '2026-06-08T11:45:00.000Z',
    })

    expect(needsHomeActionWaitingAttention(base, now)).toBe(true)
    expect(
      needsHomeActionWaitingAttention({ ...base, created_at: '2026-06-08T11:46:00.000Z' }, now),
    ).toBe(false)
    expect(needsHomeActionWaitingAttention({ ...base, source: 'manual' }, now)).toBe(false)
  })
})
