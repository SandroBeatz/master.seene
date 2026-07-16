import { describe, expect, it } from 'vitest'
import { buildDayTimeOptions } from '../day-time-options'

describe('buildDayTimeOptions', () => {
  it('generates the whole day on the step grid anchored to midnight', () => {
    const options = buildDayTimeOptions({ stepMinutes: 30 })
    expect(options[0]).toBe(0) // 00:00
    expect(options[options.length - 1]).toBe(1410) // 23:30
    expect(options).toHaveLength(48)
  })

  it('includes past times by default (earliest defaults to 0)', () => {
    const options = buildDayTimeOptions({ stepMinutes: 60 })
    expect(options).toContain(0)
    expect(options).toContain(480) // 08:00
  })

  it('starts from the first grid slot at or after `earliest`', () => {
    // earliest 08:10, step 15 → first slot 08:15 (495).
    const options = buildDayTimeOptions({ stepMinutes: 15, earliest: 490 })
    expect(options[0]).toBe(495)
    expect(options).not.toContain(480)
  })

  it('never emits a time at or beyond 24:00', () => {
    const options = buildDayTimeOptions({ stepMinutes: 45 })
    expect(options.every((minutes) => minutes < 1440)).toBe(true)
  })

  it('returns an empty array for a non-positive step', () => {
    expect(buildDayTimeOptions({ stepMinutes: 0 })).toEqual([])
    expect(buildDayTimeOptions({ stepMinutes: -15 })).toEqual([])
  })

  it('treats a negative `earliest` as the start of the day', () => {
    expect(buildDayTimeOptions({ stepMinutes: 60, earliest: -100 })[0]).toBe(0)
  })
})
