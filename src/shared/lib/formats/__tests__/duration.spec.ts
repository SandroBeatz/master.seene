import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from 'vue'
import { i18n } from '@shared/lib/i18n'
import { formatsPlugin, useFormats, type Formats } from '../index'

function makeFormats(locale: 'en' | 'fr' | 'ru'): Formats {
  i18n.global.locale.value = locale
  const app = createApp({})
  app.use(i18n)
  app.use(formatsPlugin)
  return app.runWithContext(() => useFormats())
}

describe('formats.duration', () => {
  afterEach(() => {
    i18n.global.locale.value = 'en'
  })

  it('formats hours and minutes (ru)', () => {
    const f = makeFormats('ru')
    expect(f.duration(90)).toBe('1 ч 30 мин')
    expect(f.duration(45)).toBe('45 мин')
    expect(f.duration(120)).toBe('2 ч')
    expect(f.duration(150)).toBe('2 ч 30 мин')
  })

  it('formats hours and minutes (en)', () => {
    const f = makeFormats('en')
    expect(f.duration(90)).toBe('1 h 30 min')
    expect(f.duration(45)).toBe('45 min')
    expect(f.duration(120)).toBe('2 h')
  })

  it('returns the placeholder for null, undefined and non-positive values', () => {
    const f = makeFormats('en')
    expect(f.duration(null)).toBe('—')
    expect(f.duration(undefined)).toBe('—')
    expect(f.duration(0)).toBe('—')
    expect(f.duration(-15)).toBe('—')
  })

  it('rounds fractional minutes', () => {
    const f = makeFormats('en')
    expect(f.duration(59.6)).toBe('1 h')
  })
})
