import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMostUsedPaymentTypeId, recordPaymentUsage } from '../model/frequent-payment'

const NOW = new Date('2026-05-15T12:00:00Z').getTime()
const DAY = 24 * 60 * 60 * 1000

// jsdom in this setup does not expose a real `localStorage`, so back it with a
// minimal in-memory Storage stub — enough to exercise the read/prune/count logic.
function createMemoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
    key: (index) => Array.from(map.keys())[index] ?? null,
  }
}

describe('frequent-payment', () => {
  vi.stubGlobal('localStorage', createMemoryStorage())
  afterAll(() => vi.unstubAllGlobals())

  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when there is no history', () => {
    expect(getMostUsedPaymentTypeId(['cash', 'card'], NOW)).toBeNull()
  })

  it('returns the most frequently used method', () => {
    recordPaymentUsage('cash', NOW)
    recordPaymentUsage('card', NOW)
    recordPaymentUsage('cash', NOW)
    expect(getMostUsedPaymentTypeId(['cash', 'card'], NOW)).toBe('cash')
  })

  it('ignores usage of methods not in the eligible list (inactive/removed)', () => {
    recordPaymentUsage('deleted', NOW)
    recordPaymentUsage('deleted', NOW)
    recordPaymentUsage('card', NOW)
    // `deleted` is used more but is no longer eligible → `card` wins.
    expect(getMostUsedPaymentTypeId(['cash', 'card'], NOW)).toBe('card')
  })

  it('returns null when eligible list is empty', () => {
    recordPaymentUsage('cash', NOW)
    expect(getMostUsedPaymentTypeId([], NOW)).toBeNull()
  })

  it('ignores records older than 5 days', () => {
    recordPaymentUsage('cash', NOW - 6 * DAY) // outside window
    recordPaymentUsage('cash', NOW - 6 * DAY) // outside window
    recordPaymentUsage('card', NOW - 1 * DAY) // inside window
    expect(getMostUsedPaymentTypeId(['cash', 'card'], NOW)).toBe('card')
  })

  it('counts records exactly on the 5-day boundary as in-window', () => {
    recordPaymentUsage('cash', NOW - 5 * DAY)
    expect(getMostUsedPaymentTypeId(['cash', 'card'], NOW)).toBe('cash')
  })

  it('prunes stale records when a new usage is written', () => {
    recordPaymentUsage('cash', NOW - 6 * DAY)
    recordPaymentUsage('card', NOW)
    const stored = JSON.parse(localStorage.getItem('seene.checkout.paymentUsage')!)
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe('card')
  })

  it('recomputes from scratch after the log is reset (cleared)', () => {
    recordPaymentUsage('cash', NOW)
    recordPaymentUsage('cash', NOW)
    expect(getMostUsedPaymentTypeId(['cash', 'card'], NOW)).toBe('cash')

    localStorage.clear()
    expect(getMostUsedPaymentTypeId(['cash', 'card'], NOW)).toBeNull()

    recordPaymentUsage('card', NOW)
    expect(getMostUsedPaymentTypeId(['cash', 'card'], NOW)).toBe('card')
  })

  it('survives malformed storage content', () => {
    localStorage.setItem('seene.checkout.paymentUsage', 'not json{')
    expect(getMostUsedPaymentTypeId(['cash'], NOW)).toBeNull()
    // A subsequent record should still work (overwrites the bad value).
    recordPaymentUsage('cash', NOW)
    expect(getMostUsedPaymentTypeId(['cash'], NOW)).toBe('cash')
  })
})
