import { inject, type App } from 'vue'
import { useOnboardingStore } from '@features/onboarding'

export interface Formats {
  time(value: string | null | undefined, overrideFormat?: 12 | 24): string
  price(value: number | null | undefined, currency?: string): string
}

function createFormats(): Formats {
  function time(value: string | null | undefined, overrideFormat?: 12 | 24): string {
    if (!value) return '—'
    const [hStr, mStr] = value.split(':')
    const h = parseInt(hStr ?? '0', 10)
    const m = parseInt(mStr ?? '0', 10)

    // Read format from store (auto-detected from country, or set by user toggle).
    // In the future: replace with a persistent settingsStore after onboarding.
    const store = useOnboardingStore()
    const fmt = overrideFormat ?? store.timeFormat

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
  install(app: App) {
    const f = createFormats()
    app.config.globalProperties.$f = f
    app.provide(FORMATS_KEY, f)
  },
}

export function useFormats(): Formats {
  const f = inject<Formats>(FORMATS_KEY)
  if (!f) throw new Error('useFormats: formatsPlugin not installed')
  return f
}
