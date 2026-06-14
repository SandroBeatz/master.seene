/**
 * Pure layout engine for the ScheduleTimeline widget.
 *
 * Turns a day's appointments into an ordered list of vertical segments where
 * long empty stretches collapse into a fixed-height "gap" (rendered as "···"),
 * so the timeline stays compact instead of drawing every empty hour.
 *
 * All times are "minutes from midnight" in the master's timezone — the caller
 * is responsible for converting `start_at` / "now" into that frame before
 * calling here (see `getCalendarDateTimeString`).
 */

export interface TimelineInterval {
  from: number
  to: number
}

export interface TimelineConstants {
  /** Pixels per `slotMin` minutes inside a proportional (busy) range. */
  slotHeight: number
  /** Minutes represented by one `slotHeight` (and the hour-label step). */
  slotMin: number
  /** Top padding so the first hour label is not clipped. */
  gridPaddingTop: number
  /** Empty stretches strictly longer than this collapse into a gap. */
  gapThresholdMin: number
  /** Fixed pixel height of a collapsed gap. */
  gapHeight: number
  /** Extra padding added below the last segment. */
  bottomPadding: number
}

export type TimelineSegment =
  | { kind: 'range'; from: number; to: number; top: number; height: number }
  | { kind: 'gap'; top: number; height: number }

export interface TimelineLayout {
  segments: TimelineSegment[]
  totalHeight: number
  /** Hour gridlines/labels, in minutes, that fall inside proportional ranges. */
  hourLabels: Array<{ min: number; top: number }>
  domain: { start: number; end: number }
  /**
   * Pixel offset of a given minute, or `null` when the minute lives inside a
   * collapsed gap / outside the domain (and therefore has no position).
   */
  topForMin: (min: number) => number | null
}

function floorHour(min: number): number {
  return Math.floor(min / 60) * 60
}

function ceilHour(min: number): number {
  return Math.ceil(min / 60) * 60
}

/** Merge overlapping/adjacent intervals into a sorted, non-overlapping list. */
function mergeIntervals(intervals: TimelineInterval[]): TimelineInterval[] {
  if (intervals.length === 0) return []
  const sorted = [...intervals].sort((a, b) => a.from - b.from || a.to - b.to)
  const merged: TimelineInterval[] = [{ ...sorted[0]! }]
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]!
    const last = merged[merged.length - 1]!
    if (current.from <= last.to) {
      last.to = Math.max(last.to, current.to)
    } else {
      merged.push({ ...current })
    }
  }
  return merged
}

interface RawSegment {
  kind: 'range' | 'gap'
  from?: number
  to?: number
}

export function buildTimelineLayout(params: {
  appointments: TimelineInterval[]
  workingHours: { start: number; end: number } | null
  nowMin: number | null
  constants: TimelineConstants
}): TimelineLayout {
  const { workingHours, nowMin, constants } = params
  const { slotHeight, slotMin, gridPaddingTop, gapThresholdMin, gapHeight, bottomPadding } =
    constants

  const merged = mergeIntervals(params.appointments)

  // Domain: span the working day, always extended to cover every appointment
  // and (when present) the current time so nothing is clipped.
  let domainStart: number
  let domainEnd: number
  if (workingHours) {
    domainStart = workingHours.start
    domainEnd = workingHours.end
  } else {
    domainStart = merged.length ? merged[0]!.from : (nowMin ?? 0)
    domainEnd = merged.length ? merged[merged.length - 1]!.to : (nowMin ?? 0)
  }
  for (const interval of merged) {
    domainStart = Math.min(domainStart, interval.from)
    domainEnd = Math.max(domainEnd, interval.to)
  }
  if (nowMin !== null) {
    domainStart = Math.min(domainStart, nowMin)
    domainEnd = Math.max(domainEnd, nowMin)
  }
  domainStart = floorHour(domainStart)
  domainEnd = ceilHour(domainEnd)
  if (domainEnd <= domainStart) domainEnd = domainStart + slotMin

  // Anchors that must stay visible: appointment spans plus "now" (as a
  // zero-length anchor) when it sits in otherwise-empty time.
  const anchors: TimelineInterval[] = merged.map((interval) => ({ ...interval }))
  if (nowMin !== null) {
    const insideAnchor = anchors.some((a) => nowMin >= a.from && nowMin <= a.to)
    if (!insideAnchor) {
      anchors.push({ from: nowMin, to: nowMin })
      anchors.sort((a, b) => a.from - b.from)
    }
  }

  // Walk the domain, keeping empty stretches that are short and collapsing the
  // long ones into a gap.
  const raw: RawSegment[] = []
  let cursor = domainStart
  for (const anchor of anchors) {
    const empty = anchor.from - cursor
    let rangeFrom = cursor
    if (empty > gapThresholdMin) {
      raw.push({ kind: 'gap' })
      rangeFrom = anchor.from
    }
    raw.push({ kind: 'range', from: rangeFrom, to: anchor.to })
    cursor = anchor.to
  }
  const tail = domainEnd - cursor
  if (tail > gapThresholdMin) {
    raw.push({ kind: 'gap' })
  } else if (tail > 0) {
    const last = raw[raw.length - 1]
    if (last && last.kind === 'range') {
      last.to = domainEnd
    } else {
      raw.push({ kind: 'range', from: cursor, to: domainEnd })
    }
  }

  // Assign pixel positions.
  const segments: TimelineSegment[] = []
  let top = gridPaddingTop
  for (const item of raw) {
    if (item.kind === 'gap') {
      segments.push({ kind: 'gap', top, height: gapHeight })
      top += gapHeight
    } else {
      const from = item.from!
      const to = item.to!
      const height = ((to - from) / slotMin) * slotHeight
      segments.push({ kind: 'range', from, to, top, height })
      top += height
    }
  }
  const totalHeight = top + bottomPadding

  const ranges = segments.filter((s): s is Extract<TimelineSegment, { kind: 'range' }> =>
    s.kind === 'range',
  )

  const topForMin = (min: number): number | null => {
    for (const range of ranges) {
      if (min >= range.from && min <= range.to) {
        return range.top + ((min - range.from) / slotMin) * slotHeight
      }
    }
    return null
  }

  // Hour labels at each whole-hour boundary inside a proportional range.
  const labelByMin = new Map<number, number>()
  for (const range of ranges) {
    if (range.to <= range.from) continue
    for (let m = ceilHour(range.from); m <= range.to; m += slotMin) {
      const t = topForMin(m)
      if (t !== null) labelByMin.set(m, t)
    }
  }
  const hourLabels = [...labelByMin.entries()]
    .map(([min, t]) => ({ min, top: t }))
    .sort((a, b) => a.min - b.min)

  return {
    segments,
    totalHeight,
    hourLabels,
    domain: { start: domainStart, end: domainEnd },
    topForMin,
  }
}
