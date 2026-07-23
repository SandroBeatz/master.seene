import { onScopeDispose, ref, type Ref } from 'vue'

/**
 * Reactive "current time" that updates once per minute, aligned to the wall
 * clock so the tick lands on the minute boundary (e.g. exactly at HH:MM:00).
 *
 * Useful for time-derived UI such as the schedule "now" line or appointment
 * status icons (`ongoing`/`past`) that must advance as time passes without
 * re-rendering every second. The timer is cleaned up on scope disposal.
 */
export function useNowMinute(): Ref<Date> {
  const now = ref(new Date())

  if (typeof window === 'undefined') return now

  let intervalId: ReturnType<typeof setInterval> | undefined

  const tick = () => {
    now.value = new Date()
  }

  // Align the first tick to the next minute boundary, then run every minute.
  const msToNextMinute = 60_000 - (Date.now() % 60_000)
  const timeoutId = setTimeout(() => {
    tick()
    intervalId = setInterval(tick, 60_000)
  }, msToNextMinute)

  onScopeDispose(() => {
    clearTimeout(timeoutId)
    if (intervalId !== undefined) clearInterval(intervalId)
  })

  return now
}
