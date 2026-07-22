import { inject, type App } from 'vue'
import { DEFAULT_CURRENCY_CODE, getCurrency, type CurrencyOption } from '@shared/config/currencies'
import { DEFAULT_DATE_FORMAT } from '@shared/config/date-formats'

type TimeFormat = 12 | 24

export interface FormatsPluginOptions {
  getTimeFormat?: () => TimeFormat | undefined
  /** Active currency ISO code (from master preferences). */
  getCurrency?: () => string | undefined
  /** Active date format tokens (from master preferences). */
  getDateFormat?: () => string | undefined
  /** Active UI locale, used for number grouping (e.g. 'en', 'fr', 'ru'). */
  getLocale?: () => string | undefined
}

/** Building blocks for animating a price (e.g. via AnimatedNumber) that render identically to `price()`. */
export interface PriceParts {
  format: { minimumFractionDigits: number; maximumFractionDigits: number }
  prefix?: string
  suffix?: string
}

export interface Formats {
  time(value: string | null | undefined, overrideFormat?: TimeFormat): string
  /** Formats a number as a price. `currencyOverride` is an ISO code (e.g. 'KZT'). */
  price(value: number | null | undefined, currencyOverride?: string): string
  /** Resolves the active currency (symbol, position, decimals). Falls back to the default. */
  currency(currencyOverride?: string): CurrencyOption
  /** Same rendering as `price()`, decomposed into raw format/prefix/suffix for AnimatedNumber. */
  priceParts(currencyOverride?: string): PriceParts
  /** Formats a number with grouping and a fixed number of fraction digits. */
  decimal(value: number | null | undefined, ownFloat?: number): string
  /** Inverse of grouped input: strips thousands separators, normalizes decimal. */
  parseDecimal(value: string): string
  date(value: string | Date | null | undefined, overrideFormat?: string): string
  dateTime(value: string | Date | null | undefined, overrideFormat?: string): string
}

const PLACEHOLDER = '—'

/** Pads a number to two digits. */
function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Token-based date formatter (no external date lib — the project uses native
 * Date everywhere). Supports the tokens used by shared/config/date-formats plus
 * time tokens for dateTime: YYYY, MM, DD, HH, mm.
 */
function formatWithTokens(date: Date, format: string): string {
  const map: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    MM: pad2(date.getMonth() + 1),
    DD: pad2(date.getDate()),
    HH: pad2(date.getHours()),
    mm: pad2(date.getMinutes()),
  }
  return format.replace(/YYYY|MM|DD|HH|mm/g, (token) => map[token] ?? token)
}

function createFormats(options: FormatsPluginOptions = {}): Formats {
  function locale(): string | undefined {
    return options.getLocale?.() || undefined
  }

  function time(value: string | null | undefined, overrideFormat?: TimeFormat): string {
    if (!value) return PLACEHOLDER
    const [hStr, mStr] = value.split(':')
    const h = parseInt(hStr ?? '0', 10)
    const m = parseInt(mStr ?? '0', 10)

    const fmt = overrideFormat ?? options.getTimeFormat?.() ?? 24

    if (fmt === 12) {
      const period = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 || 12
      return `${h12}:${pad2(m)} ${period}`
    }
    return `${pad2(h)}:${pad2(m)}`
  }

  function decimal(value: number | null | undefined, ownFloat?: number): string {
    if (value == null) return PLACEHOLDER
    const float = ownFloat ?? 2
    return new Intl.NumberFormat(locale(), {
      style: 'decimal',
      useGrouping: true,
      minimumFractionDigits: float,
      maximumFractionDigits: float,
    }).format(value)
  }

  function parseDecimal(value: string): string {
    if (!value) return ''
    // Remove thousands separators (dots/spaces) and normalize a decimal comma.
    return value
      .replace(/\s/g, '')
      .replace(/\.(?=\d{3}(\D|$))/g, '')
      .replace(',', '.')
  }

  function currency(currencyOverride?: string): CurrencyOption {
    const code = currencyOverride ?? options.getCurrency?.() ?? DEFAULT_CURRENCY_CODE
    // DEFAULT_CURRENCY_CODE is always present in the catalogue.
    return getCurrency(code) ?? getCurrency(DEFAULT_CURRENCY_CODE)!
  }

  function price(value: number | null | undefined, currencyOverride?: string): string {
    if (value == null) return PLACEHOLDER
    const code = currencyOverride ?? options.getCurrency?.() ?? DEFAULT_CURRENCY_CODE
    const currency = getCurrency(code) ?? getCurrency(DEFAULT_CURRENCY_CODE)

    const decimals = currency?.decimals ?? 2
    const amount = new Intl.NumberFormat(locale(), {
      style: 'decimal',
      useGrouping: true,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)

    if (!currency) return amount
    // Non-breaking space keeps the amount and symbol on the same line.
    return currency.position === 'prefix'
      ? `${currency.symbol} ${amount}`
      : `${amount} ${currency.symbol}`
  }

  function priceParts(currencyOverride?: string): PriceParts {
    const cur = currency(currencyOverride)
    return {
      format: { minimumFractionDigits: cur.decimals, maximumFractionDigits: cur.decimals },
      prefix: cur.position === 'prefix' ? `${cur.symbol} ` : undefined,
      suffix: cur.position === 'suffix' ? ` ${cur.symbol}` : undefined,
    }
  }

  function date(value: string | Date | null | undefined, overrideFormat?: string): string {
    if (!value) return PLACEHOLDER
    const parsed = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(parsed.getTime())) return PLACEHOLDER
    const format = overrideFormat ?? options.getDateFormat?.() ?? DEFAULT_DATE_FORMAT
    return formatWithTokens(parsed, format)
  }

  function dateTime(value: string | Date | null | undefined, overrideFormat?: string): string {
    if (!value) return PLACEHOLDER
    const parsed = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(parsed.getTime())) return PLACEHOLDER
    const format = overrideFormat ?? options.getDateFormat?.() ?? DEFAULT_DATE_FORMAT
    return `${formatWithTokens(parsed, format)} ${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`
  }

  return { time, price, currency, priceParts, decimal, parseDecimal, date, dateTime }
}

const FORMATS_KEY = Symbol('formats')

export const formatsPlugin = {
  install(app: App, options?: FormatsPluginOptions) {
    const f = createFormats(options)
    app.config.globalProperties.$f = f
    app.provide(FORMATS_KEY, f)
  },
}

export function useFormats(): Formats {
  const f = inject<Formats>(FORMATS_KEY)
  if (!f) throw new Error('useFormats: formatsPlugin not installed')
  return f
}
