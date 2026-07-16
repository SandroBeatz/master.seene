/** Time-of-day buckets for grouping bookable slots in the UI. */
export type PartOfDay = 'morning' | 'day' | 'evening'

/** A non-empty bucket of start minutes for one part of the day. */
export interface SlotGroup {
  part: PartOfDay
  slots: number[]
}

/** Bucket boundaries, minutes since midnight: morning < NOON <= day < EVENING <= evening. */
const NOON = 12 * 60
const EVENING = 17 * 60

function partOf(minutes: number): PartOfDay {
  if (minutes < NOON) return 'morning'
  if (minutes < EVENING) return 'day'
  return 'evening'
}

/**
 * Splits start minutes into morning / day / evening buckets for sectioned
 * rendering. Boundaries: morning `< 12:00`, day `12:00–16:59`, evening `>= 17:00`.
 * Order within each bucket mirrors the input; empty buckets are omitted, and the
 * result is ordered morning → day → evening.
 */
export function groupSlotsByPartOfDay(slots: number[]): SlotGroup[] {
  const buckets: Record<PartOfDay, number[]> = { morning: [], day: [], evening: [] }
  for (const minutes of slots) buckets[partOf(minutes)].push(minutes)

  const order: PartOfDay[] = ['morning', 'day', 'evening']
  return order
    .filter((part) => buckets[part].length > 0)
    .map((part) => ({ part, slots: buckets[part] }))
}
