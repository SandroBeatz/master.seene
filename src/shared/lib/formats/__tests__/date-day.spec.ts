import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'
import { i18n } from '@shared/lib/i18n'
import { formatsPlugin, useFormats, type Formats } from '../index'

type Locale = 'en' | 'fr' | 'ru'

function makeFormats(locale: Locale): Formats {
  i18n.global.locale.value = locale
  const app = createApp({})
  app.use(i18n)
  app.use(formatsPlugin, { getLocale: () => locale })
  return app.runWithContext(() => useFormats())
}

describe('formats.dateDay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 24, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
    i18n.global.locale.value = 'en'
  })

  it('uses relative labels for yesterday, today and tomorrow', () => {
    const formats = makeFormats('ru')

    expect(formats.dateDay(new Date(2026, 6, 23, 18))).toBe('Вчера 23 июл.')
    expect(formats.dateDay(new Date(2026, 6, 24, 9))).toBe('Сегодня 24 июл.')
    expect(formats.dateDay(new Date(2026, 6, 25, 8))).toBe('Завтра 25 июл.')
  })

  it('uses the weekday for other dates', () => {
    const formats = makeFormats('ru')

    expect(formats.dateDay(new Date(2026, 6, 27))).toBe('пн, 27 июл.')
  })

  it('localizes relative labels and date order', () => {
    expect(makeFormats('en').dateDay(new Date(2026, 6, 24))).toBe('Today Jul 24')
    expect(makeFormats('fr').dateDay(new Date(2026, 6, 24))).toBe("Aujourd'hui 24 juil.")
  })

  it('returns the placeholder for empty and invalid values', () => {
    const formats = makeFormats('en')

    expect(formats.dateDay(null)).toBe('—')
    expect(formats.dateDay(undefined)).toBe('—')
    expect(formats.dateDay('not-a-date')).toBe('—')
  })
})

describe('formats.dateDayYear', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 24, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
    i18n.global.locale.value = 'en'
  })

  it('includes the year for relative and weekday dates', () => {
    const formats = makeFormats('ru')

    expect(formats.dateDayYear(new Date(2026, 6, 24))).toBe('Сегодня 24 июл. 2026 г.')
    expect(formats.dateDayYear(new Date(2026, 6, 27))).toBe('пн, 27 июл. 2026 г.')
  })

  it('returns the placeholder for empty and invalid values', () => {
    const formats = makeFormats('en')

    expect(formats.dateDayYear(null)).toBe('—')
    expect(formats.dateDayYear('not-a-date')).toBe('—')
  })
})

describe('formats.monthYear', () => {
  afterEach(() => {
    i18n.global.locale.value = 'en'
  })

  it('formats the full month and year using the active locale', () => {
    const date = new Date(2026, 6, 24)

    expect(makeFormats('en').monthYear(date)).toBe('July 2026')
    expect(makeFormats('fr').monthYear(date)).toBe('juillet 2026')
    expect(makeFormats('ru').monthYear(date)).toBe('июль 2026 г.')
  })

  it('returns the placeholder for empty and invalid values', () => {
    const formats = makeFormats('en')

    expect(formats.monthYear(null)).toBe('—')
    expect(formats.monthYear(undefined)).toBe('—')
    expect(formats.monthYear('not-a-date')).toBe('—')
  })
})
