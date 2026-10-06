import { createGesture, type Gesture, type GestureDetail } from '@ionic/vue'
import { onBeforeUnmount, onMounted, type Ref } from 'vue'

export type CalendarPageDirection = 'prev' | 'next'

interface CalendarSwipeOptions {
  /** Element that listens for the horizontal drag. */
  target: Ref<HTMLElement | null>
  /** The calendar view surface that leans with the finger and slides in. */
  surface: () => HTMLElement | null
  /**
   * Directions that may page right now, read when a drag begins. Month and day
   * allow both; the week only past the ends of its own sideways scroll.
   */
  pageable: () => Record<CalendarPageDirection, boolean>
  /** Moves the calendar one period. */
  onPage: (direction: CalendarPageDirection) => void
}

const COMMIT_DISTANCE_PX = 60
const COMMIT_VELOCITY = 0.3
/** The view only leans with the finger — it never uncovers an empty gap. */
const DRAG_RESISTANCE = 0.3
const DRAG_MAX_PX = 32
const ENTER_OFFSET_PERCENT = 22
const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function translate(x: string) {
  return `translate3d(${x}, 0, 0)`
}

/**
 * Horizontal swipe paging for the calendar. While dragging, the view leans
 * toward the finger with resistance; a long or fast enough swipe switches the
 * period at once and the new one glides in from the swipe side (FullCalendar
 * renders it synchronously, so there is no blank frame); a short swipe springs
 * back. `slide(direction, change)` plays the same entrance for taps.
 */
export function useCalendarSwipe({ target, surface, pageable, onPage }: CalendarSwipeOptions) {
  let gesture: Gesture | undefined
  let element: HTMLElement | null = null
  let allowed: Record<CalendarPageDirection, boolean> = { prev: false, next: false }

  // A drag to the left pages forward, to the right back; a direction that may
  // not page (the week still has columns that way) is left to native scroll.
  function directionOf(deltaX: number): CalendarPageDirection {
    return deltaX < 0 ? 'next' : 'prev'
  }

  function leanFor(deltaX: number): number {
    if (!allowed[directionOf(deltaX)]) return 0
    return Math.sign(deltaX) * Math.min(Math.abs(deltaX) * DRAG_RESISTANCE, DRAG_MAX_PX)
  }

  function slide(direction: CalendarPageDirection, change: () => void) {
    change()
    // FullCalendar re-renders synchronously into the same surface element.
    const el = surface()
    if (!el) return
    el.style.transform = ''
    if (prefersReducedMotion()) return

    const from = direction === 'next' ? ENTER_OFFSET_PERCENT : -ENTER_OFFSET_PERCENT
    el.animate(
      [
        { transform: translate(`${from}%`), opacity: 0.2 },
        { transform: translate('0'), opacity: 1 },
      ],
      { duration: 260, easing: EASE_OUT },
    )
  }

  function springBack(el: HTMLElement, fromX: number) {
    el.style.transform = ''
    if (!fromX || prefersReducedMotion()) return
    el.animate([{ transform: translate(`${fromX}px`) }, { transform: translate('0') }], {
      duration: 220,
      easing: EASE_OUT,
    })
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

  function canStart() {
    allowed = pageable()
    return allowed.prev || allowed.next
  }

  function onStart() {
    element = surface()
  }

  function onMove(detail: GestureDetail) {
    if (element) element.style.transform = translate(`${leanFor(detail.deltaX)}px`)
  }

  function onEnd(detail: GestureDetail) {
    if (Math.abs(detail.deltaX) > 4) suppressNextClick()
    const el = element
    element = null
    if (!el) return

    const direction = directionOf(detail.deltaX)
    const committed =
      allowed[direction] &&
      (Math.abs(detail.deltaX) > COMMIT_DISTANCE_PX || Math.abs(detail.velocityX) > COMMIT_VELOCITY)

    if (committed) slide(direction, () => onPage(direction))
    else springBack(el, leanFor(detail.deltaX))
  }

  onMounted(() => {
    if (!target.value) return
    gesture = createGesture({
      el: target.value,
      gestureName: 'calendar-swipe-paging',
      direction: 'x',
      threshold: 12,
      canStart,
      onStart,
      onMove,
      onEnd,
    })
    gesture.enable(true)
  })

  onBeforeUnmount(() => gesture?.destroy())

  return { slide }
}
