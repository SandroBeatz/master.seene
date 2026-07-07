import { computed, type ComputedRef } from 'vue'
import { useColorMode } from '@vueuse/core'
import type { ChartOptions, ChartType } from 'chart.js'

/**
 * Theme tokens shared by all chart wrappers. Series colours (the data itself)
 * are fixed brand colours that read well in both light and dark mode; the
 * "chrome" colours (gridlines, tick labels, tooltip) are resolved from the
 * app's CSS variables so charts follow the active colour mode.
 */
export interface ChartTheme {
  /** Primary data series (amber). */
  primary: string
  primarySoft: string
  /** Secondary / comparison series (zinc). */
  neutral: string
  neutralSoft: string
  /** Emphasised element, e.g. the busiest day. */
  highlight: string
  /** Muted element, e.g. non-peak days. */
  muted: string
  grid: string
  text: string
  tooltipBg: string
  tooltipText: string
}

// Tailwind amber-500 / zinc palette. Kept as literals so canvas fillStyle never
// has to parse oklch with alpha.
const SERIES = {
  primary: '#f59e0b',
  primarySoft: 'rgba(245, 158, 11, 0.18)',
  neutral: '#a1a1aa',
  neutralSoft: 'rgba(161, 161, 170, 0.30)',
}

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

/**
 * Reactive chart theme. Recomputes whenever the colour mode changes (VueUse
 * toggles the `dark` class on <html>, which our CSS variables key off).
 */
export function useChartTheme(): ComputedRef<ChartTheme> {
  const mode = useColorMode()
  return computed<ChartTheme>(() => {
    const isDark = mode.value === 'dark'
    return {
      primary: SERIES.primary,
      primarySoft: SERIES.primarySoft,
      neutral: SERIES.neutral,
      neutralSoft: SERIES.neutralSoft,
      highlight: cssVar('--ui-text-highlighted', isDark ? '#fafafa' : '#18181b'),
      muted: isDark ? 'rgba(161, 161, 170, 0.35)' : 'rgba(228, 228, 231, 0.9)',
      grid: cssVar('--ui-border', isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
      text: cssVar('--ui-text-dimmed', isDark ? '#a1a1aa' : '#71717a'),
      tooltipBg: isDark ? '#27272a' : '#18181b',
      tooltipText: '#fafafa',
    }
  })
}

/** Common plugin/layout options shared by every chart type. */
export function baseChartOptions<T extends ChartType>(theme: ChartTheme): ChartOptions<T> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      // Legends in the mockup are custom chips rendered above each chart.
      legend: { display: false },
      tooltip: {
        backgroundColor: theme.tooltipBg,
        titleColor: theme.tooltipText,
        bodyColor: theme.tooltipText,
        borderColor: theme.grid,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
      },
    },
  } as ChartOptions<T>
}

/**
 * Minimal cartesian scales (hidden y-axis, borderless x) for bar/line charts.
 * The scales type is chart-type-independent, so the bar variant fits both.
 */
export function cartesianScales(theme: ChartTheme): ChartOptions<'bar'>['scales'] {
  return {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: theme.text, font: { size: 11 } },
    },
    y: {
      display: false,
      beginAtZero: true,
      grid: { display: false },
    },
  }
}

type Plain = Record<string, unknown>
const isPlainObject = (v: unknown): v is Plain =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Deep-merges `override` onto `base` (objects recurse; arrays/primitives replace). */
export function mergeDeep<T>(base: T, override: Partial<T> | undefined): T {
  if (!override) return base
  if (!isPlainObject(base) || !isPlainObject(override)) return (override as T) ?? base
  const out: Plain = { ...base }
  for (const key of Object.keys(override)) {
    const b = (base as Plain)[key]
    const o = (override as Plain)[key]
    out[key] = isPlainObject(b) && isPlainObject(o) ? mergeDeep(b, o as Plain) : o
  }
  return out as T
}
