import { describe, expect, it } from 'vitest'
import type { Appointment, AppointmentStatus } from '@entities/appointment'
import type { TimeBlock } from '@entities/time-block'
import { addDateInputDays, toUtcIsoFromZonedDateTime } from '@shared/lib/time-zone'
import {
  appointmentToBusyInterval,
  collectDayBusyIntervals,
  timeBlockToBusyInterval,
} from '../busy-intervals'

// Fixed +8 offset, no DST — proves conversion happens in the master's tz, not local.
const TZ = 'Asia/Singapore'

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'a1',
    user_id: 'u1',
    client_id: 'c1',
    service_ids: ['s1'],
    start_at: '2026-07-08T02:30:00Z',
    duration: 60,
    price: null,
    status: 'confirmed',
    source: 'manual',
    notes: null,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

function timeBlock(overrides: Partial<TimeBlock> = {}): TimeBlock {
  return {
    id: 't1',
    user_id: 'u1',
    start_at: '2026-07-08T02:30:00Z',
    end_at: '2026-07-08T03:30:00Z',
    all_day: false,
    notes: null,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

describe('appointmentToBusyInterval', () => {
  it('maps start + duration to minutes in the master timezone', () => {
    // 02:30Z → 10:30 SGT (630); +60 → 11:30 (690).
    expect(appointmentToBusyInterval(appointment(), '2026-07-08', TZ)).toEqual([630, 690])
  })

  it.each<AppointmentStatus>(['cancelled', 'no_show', 'expired'])(
    'excludes %s appointments',
    (status) => {
      expect(appointmentToBusyInterval(appointment({ status }), '2026-07-08', TZ)).toBeNull()
    },
  )

  it('returns null when the appointment is on another day', () => {
    expect(appointmentToBusyInterval(appointment(), '2026-07-09', TZ)).toBeNull()
  })

  it('clips an appointment that crosses midnight to each day', () => {
    // 15:30Z → 23:30 SGT (07-08); +60 → 00:30 SGT (07-09).
    const crossing = appointment({ start_at: '2026-07-08T15:30:00Z', duration: 60 })
    expect(appointmentToBusyInterval(crossing, '2026-07-08', TZ)).toEqual([1410, 1440])
    expect(appointmentToBusyInterval(crossing, '2026-07-09', TZ)).toEqual([0, 30])
  })
})

describe('timeBlockToBusyInterval', () => {
  it('maps a timed block to minutes', () => {
    // 02:30Z–03:30Z → 10:30–11:30 SGT.
    expect(timeBlockToBusyInterval(timeBlock(), '2026-07-08', TZ)).toEqual([630, 690])
  })

  it('covers the whole day for an all-day block', () => {
    // Built exactly like TimeBlockFormDialog: local 00:00 → next local 00:00.
    const start = toUtcIsoFromZonedDateTime('2026-07-08', '00:00', TZ)
    const end = toUtcIsoFromZonedDateTime(addDateInputDays('2026-07-08', 1), '00:00', TZ)
    const block = timeBlock({ all_day: true, start_at: start, end_at: end })
    expect(timeBlockToBusyInterval(block, '2026-07-08', TZ)).toEqual([0, 1440])
  })

  it('clips a multi-day block to a full interior day', () => {
    const block = timeBlock({ start_at: '2026-07-07T05:00:00Z', end_at: '2026-07-09T05:00:00Z' })
    expect(timeBlockToBusyInterval(block, '2026-07-08', TZ)).toEqual([0, 1440])
  })
})

describe('collectDayBusyIntervals', () => {
  it('combines appointments and time offs, dropping freed statuses', () => {
    const intervals = collectDayBusyIntervals({
      appointments: [
        appointment(),
        appointment({ id: 'a2', status: 'cancelled', start_at: '2026-07-08T06:00:00Z' }),
      ],
      timeBlocks: [timeBlock({ start_at: '2026-07-08T08:00:00Z', end_at: '2026-07-08T09:00:00Z' })],
      date: '2026-07-08',
      timeZone: TZ,
    })
    // 10:30–11:30 appointment + 16:00–17:00 time off; cancelled appointment dropped.
    expect(intervals).toEqual([
      [630, 690],
      [960, 1020],
    ])
  })

  it('returns [] when nothing touches the day', () => {
    expect(
      collectDayBusyIntervals({
        appointments: [],
        timeBlocks: [],
        date: '2026-07-08',
        timeZone: TZ,
      }),
    ).toEqual([])
  })
})
