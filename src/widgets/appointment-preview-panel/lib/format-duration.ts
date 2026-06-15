export type TranslateFn = (key: string, named?: Record<string, unknown>) => string

/**
 * Compact, localized duration label used by the preview date chip and the
 * service rows:
 *
 *  - `< 60`            → "45 min"
 *  - multiple of `60`  → "2h"
 *  - otherwise         → "1h 30 min"
 *
 * Relies on the i18n keys `appointments.preview.durationHours` ("{n}h") and
 * `appointments.preview.durationValue` ("{n} min").
 */
export function formatDurationChip(minutes: number, t: TranslateFn): string {
  const safe = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safe / 60)
  const mins = safe % 60

  if (hours === 0) return t('appointments.preview.durationValue', { n: mins })
  if (mins === 0) return t('appointments.preview.durationHours', { n: hours })

  return `${t('appointments.preview.durationHours', { n: hours })} ${t('appointments.preview.durationValue', { n: mins })}`
}
