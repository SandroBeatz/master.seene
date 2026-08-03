/**
 * Front-only heuristic for pre-selecting the payment method a master uses most.
 *
 * Every completed checkout appends `{ id, ts }` to a localStorage log; the modal
 * reads back the most-used method over a rolling 5-day window and pre-selects it.
 * Nothing here touches the database — clearing the storage key simply resets the
 * heuristic and it recomputes from subsequent checkouts.
 */

const STORAGE_KEY = 'seene.checkout.paymentUsage'
const WINDOW_MS = 5 * 24 * 60 * 60 * 1000

interface UsageRecord {
  /** payment_type_id */
  id: string
  /** epoch ms */
  ts: number
}

/** Read the log, dropping malformed and out-of-window (>5 days old) records. */
function readRecent(now: number): UsageRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (r): r is UsageRecord =>
        !!r &&
        typeof (r as UsageRecord).id === 'string' &&
        typeof (r as UsageRecord).ts === 'number' &&
        now - (r as UsageRecord).ts <= WINDOW_MS &&
        now - (r as UsageRecord).ts >= 0,
    )
  } catch {
    return []
  }
}

function write(records: UsageRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Storage may be unavailable (private mode / quota) — the heuristic is optional.
  }
}

/** Log that `paymentTypeId` was used to complete a checkout. */
export function recordPaymentUsage(paymentTypeId: string, now: number = Date.now()): void {
  if (!paymentTypeId) return
  // readRecent already prunes stale entries, so the log self-trims on every write.
  const records = readRecent(now)
  records.push({ id: paymentTypeId, ts: now })
  write(records)
}

/**
 * The most-used payment type over the last 5 days, restricted to `eligibleIds`
 * (so inactive/removed methods are ignored). Returns `null` when there is no
 * qualifying history. Ties are won by whichever id reached the top count first.
 */
export function getMostUsedPaymentTypeId(
  eligibleIds: string[],
  now: number = Date.now(),
): string | null {
  if (eligibleIds.length === 0) return null
  const eligible = new Set(eligibleIds)

  const counts = new Map<string, number>()
  let best: string | null = null
  let bestCount = 0

  for (const { id } of readRecent(now)) {
    if (!eligible.has(id)) continue
    const next = (counts.get(id) ?? 0) + 1
    counts.set(id, next)
    if (next > bestCount) {
      bestCount = next
      best = id
    }
  }

  return best
}
