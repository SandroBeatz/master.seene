import { describe, expect, it } from 'vitest'
import { normalizeCalendarLocale } from '../model/calendar-locale'

describe('calendar locale helpers', () => {
  it('uses supported app locales for FullCalendar', () => {
    expect(normalizeCalendarLocale('en')).toBe('en')
    expect(normalizeCalendarLocale('fr')).toBe('fr')
    expect(normalizeCalendarLocale('ru')).toBe('ru')
  })

  it('normalizes regional locale variants', () => {
    expect(normalizeCalendarLocale('fr-FR')).toBe('fr')
    expect(normalizeCalendarLocale('RU-ru')).toBe('ru')
  })

  it('falls back to English for unsupported or empty locales', () => {
    expect(normalizeCalendarLocale('es')).toBe('en')
    expect(normalizeCalendarLocale('')).toBe('en')
  })
})
