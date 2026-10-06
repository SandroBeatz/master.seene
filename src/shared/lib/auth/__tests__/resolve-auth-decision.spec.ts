import { describe, it, expect } from 'vitest'
import { resolveAuthDecision, type AuthSnapshot } from '../model/resolve-auth-decision'

const anon: AuthSnapshot = { hasSession: false, hasProfile: false, isDeactivated: false }
const onboarding: AuthSnapshot = { hasSession: true, hasProfile: false, isDeactivated: false }
const active: AuthSnapshot = { hasSession: true, hasProfile: true, isDeactivated: false }
const deactivated: AuthSnapshot = { hasSession: true, hasProfile: true, isDeactivated: true }

describe('resolveAuthDecision', () => {
  it('lets an anonymous user reach the auth area', () => {
    expect(resolveAuthDecision(anon, 'auth')).toEqual({ action: 'allow' })
  })

  it('redirects an anonymous user away from onboarding and the app', () => {
    expect(resolveAuthDecision(anon, 'onboarding')).toEqual({ action: 'redirect', to: 'auth' })
    expect(resolveAuthDecision(anon, 'app')).toEqual({ action: 'redirect', to: 'auth' })
  })

  it('forwards an authenticated user off the auth screens', () => {
    expect(resolveAuthDecision(onboarding, 'auth')).toEqual({ action: 'redirect', to: 'onboarding' })
    expect(resolveAuthDecision(active, 'auth')).toEqual({ action: 'redirect', to: 'app' })
  })

  it('forces onboarding when a profile is missing', () => {
    expect(resolveAuthDecision(onboarding, 'app')).toEqual({ action: 'redirect', to: 'onboarding' })
    expect(resolveAuthDecision(onboarding, 'onboarding')).toEqual({ action: 'allow' })
  })

  it('lets a fully onboarded user into the app', () => {
    expect(resolveAuthDecision(active, 'app')).toEqual({ action: 'allow' })
    expect(resolveAuthDecision(active, 'onboarding')).toEqual({ action: 'allow' })
  })

  it('signs out a soft-deleted account from anywhere', () => {
    expect(resolveAuthDecision(deactivated, 'auth')).toEqual({ action: 'sign-out' })
    expect(resolveAuthDecision(deactivated, 'onboarding')).toEqual({ action: 'sign-out' })
    expect(resolveAuthDecision(deactivated, 'app')).toEqual({ action: 'sign-out' })
  })
})
