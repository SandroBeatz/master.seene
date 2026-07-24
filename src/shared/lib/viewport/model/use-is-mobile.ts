import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'

/**
 * Single source of truth for the mobile/desktop shell split. Mirrors Tailwind's
 * `md` breakpoint so it matches any `md:` classes already used across the app.
 */
export function useIsMobile() {
  const breakpoints = useBreakpoints(breakpointsTailwind)
  return breakpoints.smaller('md')
}
