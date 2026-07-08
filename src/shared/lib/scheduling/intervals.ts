import type { Interval } from './types'

/** True when two intervals share any positive-length overlap. */
export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a[0] < b[1] && b[0] < a[1]
}

/**
 * Normalizes a set of intervals: drops degenerate (`start >= end`) ones, clips
 * each to `[min, max]`, sorts by start, and merges overlapping or adjacent
 * intervals into a minimal disjoint set. Used to turn a messy union of
 * appointments + time offs + breaks into clean busy blocks.
 */
export function mergeIntervals(intervals: Interval[], min: number, max: number): Interval[] {
  const clipped: Interval[] = []
  for (const [start, end] of intervals) {
    const s = Math.max(start, min)
    const e = Math.min(end, max)
    if (s < e) clipped.push([s, e])
  }

  clipped.sort((a, b) => a[0] - b[0])

  const merged: Array<[number, number]> = []
  for (const [start, end] of clipped) {
    const last = merged[merged.length - 1]
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end)
    } else {
      merged.push([start, end])
    }
  }

  return merged
}
