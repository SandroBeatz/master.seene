import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'
import { i18n } from '@shared/lib/i18n'
import { formatsPlugin, useFormats, type Formats } from '@shared/lib/formats'
import {
  createHomeOverviewPeriod,
  formatHomeOverviewPeriodLabel,
  toLocalISODate,
} from '../model/home-overview'

function makeFormats(locale: 'en' | 'fr' | 'ru'): Formats {
  i18n.global.locale.value = locale
  const app = createApp({})
  app.use(i18n)
  app.use(formatsPlugin, { getLocale: () => locale })
  return app.runWithContext(() => useFormats())
}

describe('Home Overview period model', () => {
  const anchor = new Date(2026, 5, 8, 12)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(anchor)
  })

  afterEach(() => {
    vi.useRealTimers()
    i18n.global.locale.value = 'en'
  })

  it('uses the local calendar day as the period anchor', () => {
    expect(toLocalISODate(anchor)).toBe('2026-06-08')
  })

  it.each(['day', 'week', 'month'] as const)('creates the %s analytics period', (kind) => {
    expect(createHomeOverviewPeriod(kind, anchor)).toEqual({ kind, date: '2026-06-08' })
  })

  it('formats the current day label', () => {
    expect(formatHomeOverviewPeriodLabel('day', anchor, makeFormats('en'))).toBe('Monday Jun 8')
  })

  it('formats the current week range', () => {
    expect(formatHomeOverviewPeriodLabel('week', anchor, makeFormats('en'))).toBe(
      'Mon Jun 8 – Sun Jun 14',
    )
  })

  it('formats the current month label', () => {
    expect(formatHomeOverviewPeriodLabel('month', anchor, makeFormats('en'))).toBe('June')
  })
})
