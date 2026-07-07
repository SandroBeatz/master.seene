import { computed, defineComponent, h } from 'vue'
import type { ChartTheme } from '@shared/ui/chart'

/**
 * Test double for `@shared/ui/chart`: charts render nothing in jsdom (no
 * canvas), so the specs assert the `data`/`options` props mapping instead.
 * Wire it up with `vi.mock('@shared/ui/chart', () => import('./chart-mock'))`.
 */
export const MOCK_THEME: ChartTheme = {
  primary: '#f59e0b',
  primarySoft: 'rgba(245, 158, 11, 0.18)',
  neutral: '#a1a1aa',
  neutralSoft: 'rgba(161, 161, 170, 0.30)',
  highlight: '#111111',
  muted: '#eeeeee',
  grid: '#e4e4e7',
  text: '#71717a',
  tooltipBg: '#18181b',
  tooltipText: '#fafafa',
}

function chartStub(name: string) {
  return defineComponent({
    name,
    props: {
      data: { type: Object, required: true },
      options: { type: Object, default: () => ({}) },
    },
    setup: () => () => h('div', { 'data-chart-stub': name }),
  })
}

export const BaseBarChart = chartStub('BaseBarChart')
export const BaseLineChart = chartStub('BaseLineChart')
export const BaseDoughnutChart = chartStub('BaseDoughnutChart')

export function useChartTheme() {
  return computed(() => MOCK_THEME)
}
