import { onScopeDispose, ref, type Ref } from 'vue'

export interface LongPressOptions {
  /** Hold duration before the long press fires. */
  delayMs?: number
  /** Finger travel that turns the hold into a scroll and cancels it. */
  tolerancePx?: number
}

export interface LongPress {
  /** Item currently pressed or held (drives the "lifted" visual state). */
  pressedId: Ref<string | null>
  start: (event: PointerEvent, id: string) => void
  move: (event: PointerEvent) => void
  cancel: () => void
  /** Opens immediately — right click / `contextmenu` on desktop browsers. */
  trigger: (event: Event, id: string) => void
  /** True when the click that follows a long press must be swallowed. */
  consumeClick: (id: string) => boolean
  /** Clears the held state once the long-press UI (menu) closes. */
  release: () => void
}

/**
 * Press-and-hold detection for touch lists and timelines. A hold that stays
 * within `tolerancePx` for `delayMs` calls `onLongPress`; moving further is a
 * scroll and cancels it. The synthetic click after a hold is suppressed so the
 * item's tap action does not fire on top of the long-press menu.
 */
export function useLongPress(
  onLongPress: (event: Event, id: string) => void,
  { delayMs = 550, tolerancePx = 10 }: LongPressOptions = {},
): LongPress {
  const pressedId = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined
  let held = false
  let startX = 0
  let startY = 0
  let suppressClickId: string | null = null

  function clearTimer() {
    if (timer) clearTimeout(timer)
    timer = undefined
  }

  function trigger(event: Event, id: string) {
    clearTimer()
    held = true
    suppressClickId = id
    pressedId.value = id
    onLongPress(event, id)
  }

  function start(event: PointerEvent, id: string) {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    clearTimer()
    held = false
    suppressClickId = null
    pressedId.value = id
    startX = event.clientX
    startY = event.clientY
    timer = setTimeout(() => trigger(event, id), delayMs)
  }

  function move(event: PointerEvent) {
    if (!timer) return
    const movedX = Math.abs(event.clientX - startX)
    const movedY = Math.abs(event.clientY - startY)
    if (movedX > tolerancePx || movedY > tolerancePx) cancel()
  }

  function cancel() {
    clearTimer()
    if (!held) pressedId.value = null
  }

  function consumeClick(id: string): boolean {
    clearTimer()
    if (suppressClickId !== id) return false
    suppressClickId = null
    return true
  }

  function release() {
    clearTimer()
    held = false
    suppressClickId = null
    pressedId.value = null
  }

  onScopeDispose(clearTimer)

  return { pressedId, start, move, cancel, trigger, consumeClick, release }
}
