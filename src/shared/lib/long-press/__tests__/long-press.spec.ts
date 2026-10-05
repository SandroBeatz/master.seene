import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useLongPress } from '..'

function pointer(x = 0, y = 0, overrides: Partial<PointerEvent> = {}): PointerEvent {
  return { clientX: x, clientY: y, pointerType: 'touch', button: 0, ...overrides } as PointerEvent
}

describe('useLongPress', () => {
  const scope = effectScope()

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires after the delay, keeps the item pressed, and swallows the next click', () => {
    const onLongPress = vi.fn<(event: Event, id: string) => void>()
    const press = scope.run(() => useLongPress(onLongPress, { delayMs: 500 }))!

    press.start(pointer(), 'a')
    expect(press.pressedId.value).toBe('a')
    vi.advanceTimersByTime(499)
    expect(onLongPress).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onLongPress).toHaveBeenCalledWith(expect.anything(), 'a')

    press.cancel()
    expect(press.pressedId.value).toBe('a')
    expect(press.consumeClick('a')).toBe(true)
    expect(press.consumeClick('a')).toBe(false)

    press.release()
    expect(press.pressedId.value).toBeNull()
  })

  it('treats movement beyond the tolerance as a scroll', () => {
    const onLongPress = vi.fn<(event: Event, id: string) => void>()
    const press = scope.run(() => useLongPress(onLongPress, { tolerancePx: 10 }))!

    press.start(pointer(0, 0), 'a')
    press.move(pointer(0, 11))
    vi.advanceTimersByTime(1000)

    expect(onLongPress).not.toHaveBeenCalled()
    expect(press.pressedId.value).toBeNull()
    expect(press.consumeClick('a')).toBe(false)
  })

  it('ignores secondary mouse buttons and opens immediately on trigger', () => {
    const onLongPress = vi.fn<(event: Event, id: string) => void>()
    const press = scope.run(() => useLongPress(onLongPress))!

    press.start(pointer(0, 0, { pointerType: 'mouse', button: 2 }), 'a')
    expect(press.pressedId.value).toBeNull()

    press.trigger(new Event('contextmenu'), 'b')
    expect(onLongPress).toHaveBeenCalledWith(expect.any(Event), 'b')
    expect(press.consumeClick('b')).toBe(true)
  })
})
