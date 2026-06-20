/**
 * Pure time-grid helpers for {@link TimeField}. Lives in the `shared` layer, so
 * it cannot depend on `entities` — the `'HH:mm'` parsing is intentionally local.
 */

/** Desktop select step: a value every 15 minutes. */
export const DESKTOP_STEP_MINUTES = 15

/** Mobile native `<input type="time">` step: 5 minutes, expressed in seconds. */
export const NATIVE_STEP_SECONDS = 300

const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const MINUTES_IN_DAY = 24 * 60

function isValidHHmm(value: string | undefined | null): value is string {
  return typeof value === 'string' && HHMM_PATTERN.test(value)
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':')
  return Number(hours) * 60 + Number(minutes)
}

function fromMinutes(total: number): string {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export interface BuildTimeOptionsParams {
  /** Inclusive lower bound `'HH:mm'`; values before it are excluded. */
  min?: string
  /** Inclusive upper bound `'HH:mm'`; values after it are excluded. */
  max?: string
  /** Current value — always kept in the list (even off-grid) so it stays selectable. */
  current?: string
}

/**
 * Builds the sorted, de-duplicated list of `'HH:mm'` values for the desktop
 * select: a 15-minute grid (00:00–23:45) clamped to `[min, max]`, with `current`
 * always included so an off-grid or out-of-range saved value remains visible.
 */
export function buildTimeOptions(params: BuildTimeOptionsParams = {}): string[] {
  const lower = isValidHHmm(params.min) ? toMinutes(params.min) : 0
  const upper = isValidHHmm(params.max) ? toMinutes(params.max) : MINUTES_IN_DAY - 1

  const values = new Set<number>()

  for (let minute = 0; minute < MINUTES_IN_DAY; minute += DESKTOP_STEP_MINUTES) {
    if (minute >= lower && minute <= upper) values.add(minute)
  }

  if (isValidHHmm(params.current)) {
    values.add(toMinutes(params.current))
  }

  return [...values].sort((a, b) => a - b).map(fromMinutes)
}
