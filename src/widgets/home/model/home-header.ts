export type HomeGreetingPeriod = 'morning' | 'afternoon' | 'evening' | 'night'

export interface HomeUserIdentity {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

export function getHomeGreetingPeriod(hour: number): HomeGreetingPeriod {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 22) return 'evening'
  return 'night'
}

export function getHomeUserName(identity: HomeUserIdentity, fallback: string): string {
  const fullName = [identity.firstName?.trim(), identity.lastName?.trim()].filter(Boolean).join(' ')

  return fullName || identity.email?.trim() || fallback
}

export function getHomeUserInitials(identity: HomeUserIdentity): string {
  const nameInitials = [identity.firstName, identity.lastName]
    .map((part) => part?.trim().charAt(0).toLocaleUpperCase() ?? '')
    .filter(Boolean)
    .join('')
    .slice(0, 2)

  if (nameInitials) return nameInitials

  return identity.email?.trim().charAt(0).toLocaleUpperCase() || '?'
}
