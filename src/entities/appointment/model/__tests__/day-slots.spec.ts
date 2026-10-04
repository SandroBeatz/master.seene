import { describe, expect, it } from 'vitest'
import { findAvailableSlots, type FindAvailableSlotsInput } from '@shared/lib/scheduling'
import { buildDaySlots } from '../day-slots'

const base: FindAvailableSlotsInput = {
  workStart: 9 * 60,
  workEnd: 12 * 60,
  stepMinutes: 30,
  durationMinutes: 60,
}

function states(input: FindAvailableSlotsInput) {
  return buildDaySlots(input).map((slot) => [slot.minutes / 60, slot.state])
}

describe('buildDaySlots', () => {
  it('marks every start of an empty day free until the duration no longer fits', () => {
    expect(states(base)).toEqual([
      [9, 'free'],
      [9.5, 'free'],
      [10, 'free'],
      [10.5, 'free'],
      [11, 'free'],
      [11.5, 'short'],
    ])
  })

  it('separates occupied starts from starts that run into a booking', () => {
    expect(states({ ...base, busy: [[10 * 60, 11 * 60]] })).toEqual([
      [9, 'free'],
      [9.5, 'short'],
      [10, 'busy'],
      [10.5, 'busy'],
      [11, 'free'],
      [11.5, 'short'],
    ])
  })

  it('treats breaks as busy and respects the earliest start', () => {
    expect(states({ ...base, breaks: [[11 * 60, 12 * 60]], earliest: 9 * 60 + 40 })).toEqual([
      [10, 'free'],
      [10.5, 'short'],
      [11, 'busy'],
      [11.5, 'busy'],
    ])
  })

  it('keeps the free subset identical to findAvailableSlots', () => {
    const input: FindAvailableSlotsInput = {
      ...base,
      workEnd: 18 * 60,
      stepMinutes: 15,
      durationMinutes: 75,
      busy: [
        [10 * 60 + 10, 11 * 60],
        [14 * 60, 15 * 60 + 30],
      ],
      breaks: [[13 * 60, 13 * 60 + 30]],
    }
    const free = buildDaySlots(input)
      .filter((slot) => slot.state === 'free')
      .map((slot) => slot.minutes)
    expect(free).toEqual(findAvailableSlots(input))
  })

  it('falls back to the step as duration when nothing is selected yet', () => {
    expect(states({ ...base, durationMinutes: 0, workEnd: 10 * 60 })).toEqual([
      [9, 'free'],
      [9.5, 'free'],
    ])
  })

  it('returns nothing for an empty window or invalid step', () => {
    expect(buildDaySlots({ ...base, workEnd: base.workStart })).toEqual([])
    expect(buildDaySlots({ ...base, stepMinutes: 0 })).toEqual([])
  })
})
