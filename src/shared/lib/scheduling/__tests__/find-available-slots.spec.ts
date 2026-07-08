import { describe, expect, it } from 'vitest'
import { findAvailableSlots } from '../find-available-slots'
import type { Interval } from '../types'

/** minutes-since-midnight helper: `at(9, 30)` → 570. */
const at = (h: number, m = 0) => h * 60 + m

describe('findAvailableSlots', () => {
  it('walks the step grid across an empty working day', () => {
    const slots = findAvailableSlots({
      workStart: at(9),
      workEnd: at(10),
      stepMinutes: 15,
      durationMinutes: 30,
    })
    // 09:00, 09:15, 09:30 all fit (09:30 → 10:00 exactly); 09:45 → 10:15 overflows.
    expect(slots).toEqual([at(9), at(9, 15), at(9, 30)])
  })

  it('excludes candidates that overlap an appointment', () => {
    const busy: Interval[] = [[at(9, 30), at(10, 30)]]
    const slots = findAvailableSlots({
      workStart: at(9),
      workEnd: at(11),
      busy,
      stepMinutes: 30,
      durationMinutes: 30,
    })
    // 09:00 free; 09:30 & 10:00 overlap busy; 10:30 free.
    expect(slots).toEqual([at(9), at(10, 30)])
  })

  it('treats breaks as busy intervals', () => {
    const breaks: Interval[] = [[at(12), at(13)]]
    const slots = findAvailableSlots({
      workStart: at(11),
      workEnd: at(14),
      breaks,
      stepMinutes: 60,
      durationMinutes: 60,
    })
    expect(slots).toEqual([at(11), at(13)])
  })

  it('respects the step grid and anchors slots to midnight', () => {
    const slots = findAvailableSlots({
      workStart: at(9, 5),
      workEnd: at(10),
      stepMinutes: 15,
      durationMinutes: 20,
    })
    // First grid point >= 09:05 is 09:15; then 09:30; 09:45 ends 10:05 (past).
    expect(slots).toEqual([at(9, 15), at(9, 30)])
  })

  it('drops the last slot when duration overflows the window end', () => {
    const slots = findAvailableSlots({
      workStart: at(9),
      workEnd: at(9, 50),
      stepMinutes: 15,
      durationMinutes: 45,
    })
    // Only 09:00 (→09:45) fits; 09:15 (→10:00) overflows.
    expect(slots).toEqual([at(9)])
  })

  it('excludes past times via `earliest` (today)', () => {
    const slots = findAvailableSlots({
      workStart: at(9),
      workEnd: at(11),
      stepMinutes: 30,
      durationMinutes: 30,
      earliest: at(9, 40), // "now" is 09:40
    })
    // First grid point >= 09:40 is 10:00; then 10:30.
    expect(slots).toEqual([at(10), at(10, 30)])
  })

  it('ignores `earliest` earlier than workStart (future day)', () => {
    const slots = findAvailableSlots({
      workStart: at(9),
      workEnd: at(10),
      stepMinutes: 30,
      durationMinutes: 30,
      earliest: at(6),
    })
    expect(slots).toEqual([at(9), at(9, 30)])
  })

  it('returns [] for a non-working (empty) day', () => {
    expect(
      findAvailableSlots({
        workStart: at(10),
        workEnd: at(10),
        stepMinutes: 15,
        durationMinutes: 30,
      }),
    ).toEqual([])
  })

  it('allows back-to-back bookings in the gap between appointments', () => {
    const busy: Interval[] = [
      [at(9), at(10)],
      [at(10, 30), at(11)],
    ]
    const slots = findAvailableSlots({
      workStart: at(9),
      workEnd: at(11),
      busy,
      stepMinutes: 30,
      durationMinutes: 30,
    })
    // Exactly the 10:00–10:30 gap fits.
    expect(slots).toEqual([at(10)])
  })

  it('returns [] on non-positive step or duration', () => {
    const base = { workStart: at(9), workEnd: at(17) }
    expect(findAvailableSlots({ ...base, stepMinutes: 0, durationMinutes: 30 })).toEqual([])
    expect(findAvailableSlots({ ...base, stepMinutes: 15, durationMinutes: 0 })).toEqual([])
  })

  it('returns [] when duration exceeds the whole window', () => {
    expect(
      findAvailableSlots({
        workStart: at(9),
        workEnd: at(10),
        stepMinutes: 15,
        durationMinutes: 120,
      }),
    ).toEqual([])
  })
})
