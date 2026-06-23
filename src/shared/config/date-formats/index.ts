/**
 * Supported date display formats for the System & region settings.
 *
 * `value` holds dayjs format tokens and is what we persist in
 * master_settings.date_format. Keep this list in sync with the
 * `master_settings_date_format_check` constraint
 * (migration 20260623120000_add_system_region_settings.sql).
 *
 * `label` shows the format applied to a sample date so the option is
 * self-explanatory in the select.
 */
export interface DateFormatOption {
  /** dayjs format tokens, e.g. 'DD.MM.YYYY'. */
  value: string
  /** Sample-rendered label for the select. */
  label: string
}

export const DATE_FORMATS: DateFormatOption[] = [
  { value: 'DD.MM.YYYY', label: '31.12.2026' },
  { value: 'MM/DD/YYYY', label: '12/31/2026' },
  { value: 'YYYY-MM-DD', label: '2026-12-31' },
  { value: 'DD/MM/YYYY', label: '31/12/2026' },
]

/** Default date format — mirrors the master_settings.date_format column default. */
export const DEFAULT_DATE_FORMAT = 'DD.MM.YYYY'

const DATE_FORMAT_VALUES = new Set(DATE_FORMATS.map((format) => format.value))

/** True when `value` is one of the supported date formats. */
export function isSupportedDateFormat(value: string): boolean {
  return DATE_FORMAT_VALUES.has(value)
}
