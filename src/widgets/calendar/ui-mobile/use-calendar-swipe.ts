import { createGesture, type Gesture, type GestureDetail } from '@ionic/vue'
import { onBeforeUnmount, onMounted, type Ref } from 'vue'

export type CalendarPageDirection = 'prev' | 'next'

interface CalendarSwipeOptions {
  /** Element that listens for the horizontal drag. */
  target: Ref<HTMLElement | null>
  /** The calendar view surface that follows the finger and slides. */
  surface: () => HTMLElement | null
  /** Swipe paging is on (month/day — the week scrolls sideways itself). */
  enabled: () => boolean
  /** Moves the calendar one period; runs between the slide-out and slide-in. */
  onPage: (direction: CalendarPageDirection) => void
}

const COMMIT_DISTANCE_RATIO = 0.22
const COMMIT_VELOCITY = 0.35
const SLIDE_RATIO = 0.3
const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * Horizontal swipe paging for the calendar with a native feel: the view
 * tracks the finger, a long or fast enough swipe slides it out, pages, and
 * slides the new period in from the other side; a short one springs back.
 * `slide(direction, change)` plays the same transition for taps (week strip).
 */
export function useCalendarSwipe({ target, surface, enabled, onPage }: CalendarSwipeOptions) {
  let gesture: Gesture | undefined
  let element: HTMLElement | null = null
  let width = 0
  let busy = false

  function offsetFor(deltaX: number) {
    return `translate3d(${deltaX}px, 0, 0)`
  }

  function track(deltaX: number) {
    if (!element) return
    element.style.transform = offsetFor(deltaX)
    element.style.opacity = String(1 - Math.min(Math.abs(deltaX) / width, 1) * 0.35)
  }

  function reset(el: HTMLElement) {
    el.style.transform = ''
    el.style.opacity = ''
  }

  async function slide(direction: CalendarPageDirection, change: () => void, fromX = 0) {
    const el = surface()
    if (!el || busy || prefersReducedMotion()) {
      change()
      return
    }

    busy = true
    const distance = (width || el.clientWidth) * SLIDE_RATIO
    const sign = direction === 'next' ? -1 : 1
    try {
      await el.animate(
        [
          { transform: offsetFor(fromX), opacity: el.style.opacity || 1 },
          { transform: offsetFor(sign * distance), opacity: 0 },
        ],
        { duration: 130, easing: 'ease-in', fill: 'forwards' },
      ).finished
      reset(el)
      change()
      // FullCalendar re-renders synchronously into the same surface element.
      const next = surface() ?? el
      await next.animate(
        [
          { transform: offsetFor(-sign * distance), opacity: 0 },
          { transform: offsetFor(0), opacity: 1 },
        ],
        { duration: 240, easing: EASE_OUT },
      ).finished
      el.getAnimations().forEach((animation) => animation.cancel())
    } finally {
      busy = false
    }
  }

  function springBack(fromX: number) {
    const el = element
    if (!el) return
    el.animate([{ transform: offsetFor(fromX) }, { transform: offsetFor(0) }], {
      duration: 220,
      easing: EASE_OUT,
    })
    reset(el)
  }

  function onStart() {
    element = surface()
    width = target.value?.clientWidth ?? 0
  }

  function onMove(detail: GestureDetail) {
    track(detail.deltaX)
  }

  // The pointer-up of a drag still produces a click on whatever card is under
  // the finger; swallow that one click so a swipe never opens an appointment.
  function suppressNextClick() {
    const el = target.value
    if (!el) return
    const stop = (event: Event) => {
      event.stopPropagation()
      event.preventDefault()
    }
    el.addEventListener('click', stop, { capture: true, once: true })
    setTimeout(() => el.removeEventListener('click', stop, { capture: true }), 400)
  }

  function onEnd(detail: GestureDetail) {
    suppressNextClick()
    const committed =
      Math.abs(detail.deltaX) > width * COMMIT_DISTANCE_RATIO ||
      Math.abs(detail.velocityX) > COMMIT_VELOCITY
    if (!committed || !element) {
      springBack(detail.deltaX)
      element = null
      return
    }

    const direction: CalendarPageDirection = detail.deltaX < 0 ? 'next' : 'prev'
    element = null
    void slide(direction, () => onPage(direction), detail.deltaX)
  }

  onMounted(() => {
    if (!target.value) return
    gesture = createGesture({
      el: target.value,
      gestureName: 'calendar-swipe-paging',
      direction: 'x',
      threshold: 12,
      canStart: () => enabled() && !busy,
      onStart,
      onMove,
      onEnd,
    })
    gesture.enable(true)
  })

  onBeforeUnmount(() => gesture?.destroy())

  return { slide }
}
