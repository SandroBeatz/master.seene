export type SupportedCalendarLocale = 'en' | 'fr' | 'ru'

const SUPPORTED_CALENDAR_LOCALES = new Set<SupportedCalendarLocale>(['en', 'fr', 'ru'])
const DEFAULT_CALENDAR_LOCALE: SupportedCalendarLocale = 'en'

export function normalizeCalendarLocale(locale: string): SupportedCalendarLocale {
  const languageCode = locale.trim().toLowerCase().split('-')[0]

  return SUPPORTED_CALENDAR_LOCALES.has(languageCode as SupportedCalendarLocale)
    ? (languageCode as SupportedCalendarLocale)
    : DEFAULT_CALENDAR_LOCALE
}
