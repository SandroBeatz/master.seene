import { describe, expect, it } from 'vitest'
import { formatDurationChip } from '../lib/format-duration'

// Mimics vue-i18n's `t` for the two keys the formatter uses.
const t = (key: string, named?: Record<string, unknown>) => {
  const n = named?.n
  if (key === 'appointments.preview.durationHours') return `${n}h`
  if (key === 'appointments.preview.durationValue') return `${n} min`
  return key
}

describe('formatDurationChip', () => {
  it('renders minutes only when under an hour', () => {
    expect(formatDurationChip(45, t)).toBe('45 min')
    expect(formatDurationChip(5, t)).toBe('5 min')
  })

  it('renders whole hours without a minutes part', () => {
    expect(formatDurationChip(60, t)).toBe('1h')
    expect(formatDurationChip(120, t)).toBe('2h')
  })

  it('combines hours and minutes', () => {
    expect(formatDurationChip(90, t)).toBe('1h 30 min')
    expect(formatDurationChip(135, t)).toBe('2h 15 min')
  })

  it('handles zero as "0 min"', () => {
    expect(formatDurationChip(0, t)).toBe('0 min')
  })

  it('clamps negatives and rounds fractional minutes', () => {
    expect(formatDurationChip(-30, t)).toBe('0 min')
    expect(formatDurationChip(59.6, t)).toBe('1h')
  })
})
