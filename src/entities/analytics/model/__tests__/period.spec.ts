import { describe, expect, it } from 'vitest'
import { periodToDateRange } from '../period'

describe('periodToDateRange', () => {
  it('today: returns start and end of the given day', () => {
    const now = new Date(2026, 4, 15, 14, 30, 0) // May 15 2026 14:30 local
    const { from, to } = periodToDateRange('today', now)
    expect(from).toBe(new Date(2026, 4, 15, 0, 0, 0, 0).toISOString())
    expect(to).toBe(new Date(2026, 4, 15, 23, 59, 59, 999).toISOString())
  })

  it('week: returns Monday through Sunday when today is Friday', () => {
    // 2026-05-15 is a Friday
    const now = new Date(2026, 4, 15, 10, 0, 0)
    const { from, to } = periodToDateRange('week', now)
    expect(from).toBe(new Date(2026, 4, 11, 0, 0, 0, 0).toISOString()) // Mon May 11
    expect(to).toBe(new Date(2026, 4, 17, 23, 59, 59, 999).toISOString()) // Sun May 17
  })

  it('week: returns correct week when today is Sunday', () => {
    // 2026-05-17 is a Sunday
    const now = new Date(2026, 4, 17, 10, 0, 0)
    const { from, to } = periodToDateRange('week', now)
    expect(from).toBe(new Date(2026, 4, 11, 0, 0, 0, 0).toISOString()) // Mon May 11
    expect(to).toBe(new Date(2026, 4, 17, 23, 59, 59, 999).toISOString()) // Sun May 17
  })

  it('week: returns correct week when today is Monday', () => {
    // 2026-05-11 is a Monday
    const now = new Date(2026, 4, 11, 9, 0, 0)
    const { from, to } = periodToDateRange('week', now)
    expect(from).toBe(new Date(2026, 4, 11, 0, 0, 0, 0).toISOString())
    expect(to).toBe(new Date(2026, 4, 17, 23, 59, 59, 999).toISOString())
  })

  it('month: returns first and last day of the current month', () => {
    const now = new Date(2026, 4, 15, 10, 0, 0) // May 2026
    const { from, to } = periodToDateRange('month', now)
    expect(from).toBe(new Date(2026, 4, 1, 0, 0, 0, 0).toISOString())
    expect(to).toBe(new Date(2026, 4, 31, 23, 59, 59, 999).toISOString())
  })

  it('month: handles February in a non-leap year', () => {
    const now = new Date(2026, 1, 10, 10, 0, 0) // Feb 2026
    const { from, to } = periodToDateRange('month', now)
    expect(from).toBe(new Date(2026, 1, 1, 0, 0, 0, 0).toISOString())
    expect(to).toBe(new Date(2026, 1, 28, 23, 59, 59, 999).toISOString())
  })
})
