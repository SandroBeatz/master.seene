import { describe, expect, it } from 'vitest'
import {
  buildTimelineLayout,
  type TimelineConstants,
  type TimelineSegment,
} from '../model/timeline-layout'

const C: TimelineConstants = {
  slotHeight: 65,
  slotMin: 60,
  gridPaddingTop: 10,
  gapThresholdMin: 60,
  gapHeight: 24,
  bottomPadding: 12,
  minBlockHeight: 70, // MIN_CARD_H (65) + BLOCK_GAP (5)
}

const kinds = (segments: TimelineSegment[]) => segments.map((s) => s.kind)

describe('buildTimelineLayout', () => {
  it('renders a single appointment as its slot plus the trailing hour filler', () => {
    const layout = buildTimelineLayout({
      appointments: [{ from: 540, to: 630 }], // 09:00–10:30
      workingHours: null,
      nowMin: null,
      constants: C,
    })

    // Appointment slot (540–630) + proportional filler up to the next hour (660).
    expect(kinds(layout.segments)).toEqual(['range', 'range'])
    // 09:00 sits at the top padding; the 90-min slot (97.5px) maps 10:00 to +65.
    expect(layout.topForMin(540)).toBe(10)
    expect(layout.topForMin(600)).toBe(75)
    expect(layout.totalHeight).toBeGreaterThan(0)
    expect(layout.hourLabels.map((l) => l.min)).toContain(600)
  })

  it('collapses a long empty stretch between two appointments into a gap', () => {
    const layout = buildTimelineLayout({
      appointments: [
        { from: 540, to: 570 }, // 09:00–09:30
        { from: 840, to: 900 }, // 14:00–15:00
      ],
      workingHours: null,
      nowMin: null,
      constants: C,
    })

    expect(kinds(layout.segments)).toEqual(['range', 'gap', 'range'])
    // A minute inside the collapsed gap has no pixel position.
    expect(layout.topForMin(600)).toBeNull()
    expect(layout.topForMin(840)).not.toBeNull()
  })

  it('keeps a short empty stretch proportional (no collapse at/under threshold)', () => {
    const layout = buildTimelineLayout({
      appointments: [
        { from: 540, to: 570 }, // 09:00–09:30
        { from: 600, to: 660 }, // 10:00–11:00 (30-min gap, == is not > threshold... here 30 < 60)
      ],
      workingHours: null,
      nowMin: null,
      constants: C,
    })

    expect(kinds(layout.segments)).not.toContain('gap')
    // The empty 09:30–10:00 is rendered proportionally, so 09:45 has a position.
    expect(layout.topForMin(585)).not.toBeNull()
  })

  it('inserts the now-line after a collapsed tail (appt, ···, now, ···)', () => {
    const layout = buildTimelineLayout({
      appointments: [{ from: 540, to: 600 }], // 09:00–10:00
      workingHours: { start: 540, end: 1080 }, // 09:00–18:00
      nowMin: 900, // 15:00
      constants: C,
    })

    // range (appt) → gap → range (zero-length now anchor) → gap (rest of day)
    expect(kinds(layout.segments)).toEqual(['range', 'gap', 'range', 'gap'])
    expect(layout.topForMin(900)).not.toBeNull()
    // "now" sits right below the first collapsed gap; the 60-min appointment is
    // expanded to the minimum slot height (70px).
    expect(layout.topForMin(900)).toBe(10 + 70 + 24)
  })

  it('does not add a separate now anchor when now is inside an appointment', () => {
    const layout = buildTimelineLayout({
      appointments: [{ from: 540, to: 600 }], // 09:00–10:00
      workingHours: { start: 540, end: 1080 },
      nowMin: 570, // 09:30, inside the appointment
      constants: C,
    })

    // Only the appointment range + the collapsed rest-of-day gap.
    expect(kinds(layout.segments)).toEqual(['range', 'gap'])
    // 09:30 is halfway through the 60-min appointment, expanded to a 70px slot.
    expect(layout.topForMin(570)).toBe(45) // 10 + (30/60)*70
  })

  it('expands short appointments to the minimum slot height', () => {
    const layout = buildTimelineLayout({
      appointments: [{ from: 540, to: 570 }], // 09:00–09:30 (30 min → 32.5px proportional)
      workingHours: null,
      nowMin: null,
      constants: C,
    })

    // The 30-min appointment occupies the full 70px minimum slot, not 32.5px.
    expect(layout.topForMin(570)! - layout.topForMin(540)!).toBe(70)
  })

  it('stacks back-to-back short appointments without overlap', () => {
    const layout = buildTimelineLayout({
      appointments: [
        { from: 540, to: 570 }, // 09:00–09:30
        { from: 570, to: 600 }, // 09:30–10:00
      ],
      workingHours: null,
      nowMin: null,
      constants: C,
    })

    const a1Top = layout.topForMin(540)!
    const a1Bottom = layout.topForMin(570)!
    const a2Bottom = layout.topForMin(600)!

    // Each slot is at least the minimum; the second starts exactly where the
    // first ends, so cards never collide.
    expect(a1Bottom - a1Top).toBe(70)
    expect(a2Bottom - a1Bottom).toBe(70)
  })

  it('spans the full working day, extended to cover out-of-hours appointments', () => {
    const layout = buildTimelineLayout({
      appointments: [{ from: 480, to: 540 }], // 08:00–09:00, before a 09:00 start
      workingHours: { start: 540, end: 1080 },
      nowMin: null,
      constants: C,
    })

    expect(layout.domain.start).toBe(480) // extended down to the early appointment
    expect(layout.domain.end).toBe(1080)
  })
})
