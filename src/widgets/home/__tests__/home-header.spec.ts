import { describe, expect, it } from 'vitest'
import { getHomeGreetingPeriod, getHomeUserInitials, getHomeUserName } from '../model/home-header'

describe('getHomeGreetingPeriod', () => {
  it.each([
    [4, 'night'],
    [5, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [17, 'afternoon'],
    [18, 'evening'],
    [21, 'evening'],
    [22, 'night'],
  ] as const)('maps %i:00 to %s', (hour, expected) => {
    expect(getHomeGreetingPeriod(hour)).toBe(expected)
  })
})

describe('getHomeUserName', () => {
  it('builds and trims the full profile name', () => {
    expect(
      getHomeUserName(
        { firstName: '  Ada ', lastName: ' Lovelace  ', email: 'ada@example.com' },
        'User',
      ),
    ).toBe('Ada Lovelace')
  })

  it('falls back to the account email when the profile name is empty', () => {
    expect(
      getHomeUserName({ firstName: ' ', lastName: '', email: 'ada@example.com' }, 'User'),
    ).toBe('ada@example.com')
  })

  it('uses the localized fallback when profile and email are unavailable', () => {
    expect(getHomeUserName({}, 'User')).toBe('User')
  })
})

describe('getHomeUserInitials', () => {
  it('uses the first and last profile initials', () => {
    expect(getHomeUserInitials({ firstName: 'Ada', lastName: 'Lovelace' })).toBe('AL')
  })

  it('uses the email initial when the profile name is empty', () => {
    expect(getHomeUserInitials({ email: 'ada@example.com' })).toBe('A')
  })

  it('uses a neutral fallback when identity is unavailable', () => {
    expect(getHomeUserInitials({})).toBe('?')
  })
})
