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
  /** Pixels per `slotMin` minutes inside a proportional (empty) range. */
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
  /**
   * Minimum pixel height allocated to a single appointment slot. Short
   * appointments are expanded to this so every card stays readable and cards
   * never overlap (their height is derived from this allocation, not from the
   * raw proportional span).
   */
  minBlockHeight: number
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

interface Anchor {
  from: number
  to: number
  kind: 'appt' | 'now'
}

export function buildTimelineLayout(params: {
  appointments: TimelineInterval[]
  workingHours: { start: number; end: number } | null
  nowMin: number | null
  constants: TimelineConstants
}): TimelineLayout {
  const { workingHours, nowMin, constants } = params
  const {
    slotHeight,
    slotMin,
    gridPaddingTop,
    gapThresholdMin,
    gapHeight,
    bottomPadding,
    minBlockHeight,
  } = constants

  // Each appointment keeps its own slot (no merging) so short ones can be
  // expanded to `minBlockHeight` independently and cards never overlap.
  const appts = [...params.appointments].sort((a, b) => a.from - b.from || a.to - b.to)

  // Domain: span the working day, always extended to cover every appointment
  // and (when present) the current time so nothing is clipped.
  let domainStart: number
  let domainEnd: number
  if (workingHours) {
    domainStart = workingHours.start
    domainEnd = workingHours.end
  } else {
    domainStart = appts.length ? appts[0]!.from : (nowMin ?? 0)
    domainEnd = appts.length ? appts[appts.length - 1]!.to : (nowMin ?? 0)
  }
  for (const interval of appts) {
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
  const anchors: Anchor[] = appts.map((interval) => ({ ...interval, kind: 'appt' as const }))
  if (nowMin !== null) {
    const insideAnchor = appts.some((a) => nowMin >= a.from && nowMin <= a.to)
    if (!insideAnchor) anchors.push({ from: nowMin, to: nowMin, kind: 'now' })
  }
  anchors.sort((a, b) => a.from - b.from || a.to - b.to)

  const segments: TimelineSegment[] = []
  let top = gridPaddingTop

  // Empty stretch: collapse long ones into a fixed gap, keep short ones
  // proportional so the timeline reads continuously.
  const pushEmpty = (from: number, to: number) => {
    const empty = to - from
    if (empty <= 0) return
    if (empty > gapThresholdMin) {
      segments.push({ kind: 'gap', top, height: gapHeight })
      top += gapHeight
    } else {
      const height = (empty / slotMin) * slotHeight
      segments.push({ kind: 'range', from, to, top, height })
      top += height
    }
  }

  let cursor = domainStart
  for (const anchor of anchors) {
    if (anchor.from > cursor) {
      pushEmpty(cursor, anchor.from)
      cursor = anchor.from
    }
    // Appointment slots are expanded to `minBlockHeight`; the "now" anchor is a
    // zero-height marker only used to position the current-time line.
    const proportional = ((anchor.to - anchor.from) / slotMin) * slotHeight
    const height = anchor.kind === 'now' ? 0 : Math.max(proportional, minBlockHeight)
    segments.push({ kind: 'range', from: anchor.from, to: anchor.to, top, height })
    top += height
    cursor = Math.max(cursor, anchor.to)
  }
  pushEmpty(cursor, domainEnd)

  const totalHeight = top + bottomPadding

  const ranges = segments.filter(
    (s): s is Extract<TimelineSegment, { kind: 'range' }> => s.kind === 'range',
  )

  // Map a minute to its pixel offset using the containing range's own height
  // (which may be stretched beyond the proportional span for short appointments).
  const topForMin = (min: number): number | null => {
    for (const range of ranges) {
      if (min >= range.from && min <= range.to) {
        if (range.to === range.from) return range.top
        return range.top + ((min - range.from) / (range.to - range.from)) * range.height
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
