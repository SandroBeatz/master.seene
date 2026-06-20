import { onScopeDispose, ref, type Ref } from 'vue'

/**
 * Reactive `matchMedia` wrapper. Returns a ref that tracks whether `query`
 * currently matches and updates on viewport changes. Safe in non-browser
 * environments (returns a `false` ref when `matchMedia` is unavailable).
 */
export function useMediaQuery(query: string): Ref<boolean> {
  const matches = ref(false)

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return matches
  }

  const mql = window.matchMedia(query)
  matches.value = mql.matches

  const onChange = (event: MediaQueryListEvent) => {
    matches.value = event.matches
  }

  mql.addEventListener('change', onChange)
  onScopeDispose(() => mql.removeEventListener('change', onChange))

  return matches
}
