import { describe, it, expect } from 'vitest'
import { priceToNumber, sanitizePrice } from '../parse'

describe('sanitizePrice', () => {
  it('strips non-numeric characters', () => {
    expect(sanitizePrice('12a3', 2)).toBe('123')
    expect(sanitizePrice('$45', 2)).toBe('45')
    expect(sanitizePrice('-10', 2)).toBe('10')
  })

  it('drops the fraction for zero-decimal currencies', () => {
    expect(sanitizePrice('1234', 0)).toBe('1234')
    expect(sanitizePrice('12.50', 0)).toBe('1250')
    expect(sanitizePrice('12,50', 0)).toBe('1250')
  })

  it('normalises a decimal comma to a dot', () => {
    expect(sanitizePrice('12,5', 2)).toBe('12.5')
  })

  it('keeps a single separator and clamps fraction digits', () => {
    expect(sanitizePrice('12.3.4', 2)).toBe('12.34')
    expect(sanitizePrice('12.345', 2)).toBe('12.34')
    expect(sanitizePrice('12.345', 3)).toBe('12.345')
  })

  it('allows a trailing separator while typing', () => {
    expect(sanitizePrice('12.', 2)).toBe('12.')
  })
})

describe('priceToNumber', () => {
  it('parses valid numbers', () => {
    expect(priceToNumber('123')).toBe(123)
    expect(priceToNumber('12.5')).toBe(12.5)
  })

  it('returns null for empty or partial values', () => {
    expect(priceToNumber('')).toBeNull()
    expect(priceToNumber('.')).toBeNull()
  })
})
