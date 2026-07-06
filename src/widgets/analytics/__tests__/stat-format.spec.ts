import { describe, expect, it } from 'vitest'
import { deltaPct, workingHoursLabel, type TranslateFn } from '../lib/stat-format'

// Echo translator: analytics.hoursUnit → 'h', analytics.minutesUnit → 'min'.
const t: TranslateFn = (key) => (key.split('.').pop() === 'hoursUnit' ? 'h' : 'min')

describe('deltaPct', () => {
  it('computes the rounded percentage change', () => {
    expect(deltaPct(150, 100)).toBe(50)
    expect(deltaPct(100, 150)).toBe(-33)
    expect(deltaPct(100, 100)).toBe(0)
  })

  it('rounds to the nearest integer', () => {
    expect(deltaPct(104, 100)).toBe(4)
    expect(deltaPct(1, 3)).toBe(-67)
  })

  it('returns null when there is no baseline (previous = 0)', () => {
    expect(deltaPct(100, 0)).toBeNull()
    expect(deltaPct(0, 0)).toBeNull()
  })

  it('drop to zero is -100%', () => {
    expect(deltaPct(0, 80)).toBe(-100)
  })
})

describe('workingHoursLabel', () => {
  it('zero minutes → "0 h"', () => {
    expect(workingHoursLabel(0, t)).toBe('0 h')
  })

  it('exact hours omit the minutes part', () => {
    expect(workingHoursLabel(120, t)).toBe('2 h')
  })

  it('mixed hours and minutes', () => {
    expect(workingHoursLabel(150, t)).toBe('2 h 30 min')
  })

  it('less than an hour keeps the zero-hours prefix', () => {
    expect(workingHoursLabel(45, t)).toBe('0 h 45 min')
  })
})
