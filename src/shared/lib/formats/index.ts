import { inject, type App } from 'vue'

type TimeFormat = 12 | 24

export interface FormatsPluginOptions {
  getTimeFormat?: () => TimeFormat | undefined
}

export interface Formats {
  time(value: string | null | undefined, overrideFormat?: TimeFormat): string
  price(value: number | null | undefined, currency?: string): string
}

function createFormats(options: FormatsPluginOptions = {}): Formats {
  function time(value: string | null | undefined, overrideFormat?: TimeFormat): string {
    if (!value) return '—'
    const [hStr, mStr] = value.split(':')
    const h = parseInt(hStr ?? '0', 10)
    const m = parseInt(mStr ?? '0', 10)

    const fmt = overrideFormat ?? options.getTimeFormat?.() ?? 24

    if (fmt === 12) {
      const period = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 || 12
      return `${h12}:${String(m).padStart(2, '0')} ${period}`
    }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  function price(value: number | null | undefined, currency = 'USD'): string {
    if (value == null) return '—'
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)
  }

  return { time, price }
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
