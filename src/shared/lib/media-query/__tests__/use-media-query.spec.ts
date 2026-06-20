import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useMediaQuery } from '..'

afterEach(() => {
  vi.restoreAllMocks()
  // @ts-expect-error allow resetting the stubbed global between tests
  delete window.matchMedia
})

describe('useMediaQuery', () => {
  it('returns false when matchMedia is unavailable', () => {
    const matches = useMediaQuery('(min-width: 640px)')
    expect(matches.value).toBe(false)
  })

  it('reflects the initial match and reacts to change events', () => {
    let handler: ((event: MediaQueryListEvent) => void) | undefined

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: (_: string, cb: (event: MediaQueryListEvent) => void) => {
        handler = cb
      },
      removeEventListener: vi.fn(),
    }))

    const scope = effectScope()
    const matches = scope.run(() => useMediaQuery('(min-width: 640px)'))!

    expect(matches.value).toBe(true)
    handler?.({ matches: false } as MediaQueryListEvent)
    expect(matches.value).toBe(false)

    scope.stop()
  })
})
