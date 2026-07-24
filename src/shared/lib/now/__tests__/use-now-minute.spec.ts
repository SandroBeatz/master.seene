import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useNowMinute } from '../index'

describe('useNowMinute', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-14T09:15:30.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('advances to the next minute boundary, then every minute', () => {
    const scope = effectScope()
    const now = scope.run(() => useNowMinute())!

    expect(now.value.toISOString()).toBe('2026-06-14T09:15:30.000Z')

    // 30s to the boundary (09:16:00), nothing before then.
    vi.advanceTimersByTime(29_000)
    expect(now.value.toISOString()).toBe('2026-06-14T09:15:30.000Z')

    vi.advanceTimersByTime(1_000)
    expect(now.value.toISOString()).toBe('2026-06-14T09:16:00.000Z')

    // Then a tick every full minute.
    vi.advanceTimersByTime(60_000)
    expect(now.value.toISOString()).toBe('2026-06-14T09:17:00.000Z')

    scope.stop()
  })

  it('stops ticking after the scope is disposed', () => {
    const scope = effectScope()
    const now = scope.run(() => useNowMinute())!

    vi.advanceTimersByTime(45_000) // cross the first boundary
    const settled = now.value.toISOString()
    expect(settled).toBe('2026-06-14T09:16:00.000Z')

    scope.stop()
    vi.advanceTimersByTime(5 * 60_000)
    expect(now.value.toISOString()).toBe(settled)
  })
})
