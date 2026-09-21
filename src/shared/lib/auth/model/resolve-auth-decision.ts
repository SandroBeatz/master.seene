/** Which area of the app a target route belongs to, for auth gating. */
export type AuthArea = 'auth' | 'onboarding' | 'app'

/**
 * Minimal snapshot of session state the guard needs. Deliberately plain data
 * (no entity imports) so this decision helper can live in `shared/` and be
 * reused by both the desktop and mobile routers.
 */
export interface AuthSnapshot {
  hasSession: boolean
  hasProfile: boolean
  isDeactivated: boolean
}

export type AuthDecision =
  /** Soft-deleted account — caller signs out and bounces to the auth area. */
  | { action: 'sign-out' }
  /** Gate the navigation: send the user to another area. */
  | { action: 'redirect'; to: AuthArea }
  /** Proceed to the requested route. */
  | { action: 'allow' }

/**
 * Single source of truth for auth routing, shared by the desktop
 * (`src/app/router`) and mobile (`src/app-mobile/router`) routers. Pure: takes a
 * session snapshot plus the target area and returns what the router should do.
 * Each router maps the semantic areas (`auth`/`onboarding`/`app`) to its own
 * concrete paths, so the decision logic stays in one place while URLs can differ.
 */
export function resolveAuthDecision(auth: AuthSnapshot, area: AuthArea): AuthDecision {
  // Soft-deleted account: sign out and block access regardless of destination.
  if (auth.hasSession && auth.isDeactivated) return { action: 'sign-out' }

  // Unauthenticated: only the auth area (login/register) is reachable.
  if (!auth.hasSession) {
    return area === 'auth' ? { action: 'allow' } : { action: 'redirect', to: 'auth' }
  }

  // Authenticated on an auth screen: forward to the app or into onboarding
  // depending on whether the profile (= completed onboarding) exists.
  if (area === 'auth') {
    return { action: 'redirect', to: auth.hasProfile ? 'app' : 'onboarding' }
  }

  // Authenticated in the app without a completed profile: force onboarding.
  if (area === 'app' && !auth.hasProfile) {
    return { action: 'redirect', to: 'onboarding' }
  }

  return { action: 'allow' }
}
