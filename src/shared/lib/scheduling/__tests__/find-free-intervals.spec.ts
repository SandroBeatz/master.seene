import { describe, expect, it } from 'vitest'
import { findFreeIntervals } from '../find-free-intervals'
import type { Interval } from '../types'

const at = (h: number, m = 0) => h * 60 + m

describe('findFreeIntervals', () => {
  it('returns the whole window for an empty day', () => {
    expect(findFreeIntervals({ workStart: at(9), workEnd: at(18) })).toEqual([[at(9), at(18)]])
  })

  it('returns the complement of the busy set', () => {
    const busy: Interval[] = [
      [at(10), at(11)],
      [at(14), at(15, 30)],
    ]
    expect(findFreeIntervals({ workStart: at(9), workEnd: at(18), busy })).toEqual([
      [at(9), at(10)],
      [at(11), at(14)],
      [at(15, 30), at(18)],
    ])
  })

  it('merges overlapping busy blocks into one gap', () => {
    const busy: Interval[] = [
      [at(10), at(12)],
      [at(11), at(13)],
    ]
    expect(findFreeIntervals({ workStart: at(9), workEnd: at(18), busy })).toEqual([
      [at(9), at(10)],
      [at(13), at(18)],
    ])
  })

  it('produces no zero-length gap between adjacent busy blocks', () => {
    const busy: Interval[] = [
      [at(10), at(11)],
      [at(11), at(12)],
    ]
    expect(findFreeIntervals({ workStart: at(9), workEnd: at(18), busy })).toEqual([
      [at(9), at(10)],
      [at(12), at(18)],
    ])
  })

  it('splits the window around breaks', () => {
    const breaks: Interval[] = [[at(13), at(14)]]
    expect(findFreeIntervals({ workStart: at(9), workEnd: at(18), breaks })).toEqual([
      [at(9), at(13)],
      [at(14), at(18)],
    ])
  })

  it('clips busy blocks that extend beyond the window', () => {
    const busy: Interval[] = [
      [at(6), at(10)], // starts before workStart
      [at(17), at(22)], // ends after workEnd
    ]
    expect(findFreeIntervals({ workStart: at(9), workEnd: at(18), busy })).toEqual([
      [at(10), at(17)],
    ])
  })

  it('returns [] for a fully booked day', () => {
    const busy: Interval[] = [[at(8), at(19)]]
    expect(findFreeIntervals({ workStart: at(9), workEnd: at(18), busy })).toEqual([])
  })

  it('returns [] for a degenerate window', () => {
    expect(findFreeIntervals({ workStart: at(10), workEnd: at(10) })).toEqual([])
    expect(findFreeIntervals({ workStart: at(12), workEnd: at(9) })).toEqual([])
  })
})
