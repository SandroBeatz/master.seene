import { describe, expect, it } from 'vitest'
import { hasAnyFreeSlot } from '../day-availability'
import type { Interval } from '../types'

const at = (h: number, m = 0) => h * 60 + m

describe('hasAnyFreeSlot', () => {
  it('is false for a day with no working hours', () => {
    expect(
      hasAnyFreeSlot({ workStart: at(10), workEnd: at(10), stepMinutes: 15, durationMinutes: 30 }),
    ).toBe(false)
  })

  it('is true when at least one gap fits the duration', () => {
    const busy: Interval[] = [
      [at(9), at(12)],
      [at(12, 30), at(18)],
    ]
    // Only the 12:00–12:30 gap is free — fits a 30-min service.
    expect(
      hasAnyFreeSlot({
        workStart: at(9),
        workEnd: at(18),
        busy,
        stepMinutes: 30,
        durationMinutes: 30,
      }),
    ).toBe(true)
  })

  it('is false for a fully booked day', () => {
    const busy: Interval[] = [[at(8), at(19)]]
    expect(
      hasAnyFreeSlot({
        workStart: at(9),
        workEnd: at(18),
        busy,
        stepMinutes: 15,
        durationMinutes: 30,
      }),
    ).toBe(false)
  })

  it('is sensitive to duration — a long service may not fit', () => {
    const busy: Interval[] = [
      [at(9), at(12)],
      [at(12, 30), at(18)],
    ]
    // The only free gap is 30 min; a 60-min service cannot fit.
    expect(
      hasAnyFreeSlot({
        workStart: at(9),
        workEnd: at(18),
        busy,
        stepMinutes: 30,
        durationMinutes: 60,
      }),
    ).toBe(false)
  })

  it('is false when every fitting slot is in the past (today)', () => {
    // Window fits a 30-min slot, but "now" (earliest) is past the last one.
    expect(
      hasAnyFreeSlot({
        workStart: at(9),
        workEnd: at(10),
        stepMinutes: 30,
        durationMinutes: 30,
        earliest: at(9, 45),
      }),
    ).toBe(false)
  })
})
