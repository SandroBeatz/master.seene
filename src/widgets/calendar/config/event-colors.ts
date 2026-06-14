export interface CalendarEventColorSet {
  borderColor: string
  backgroundColor: string
  textColor: string
}

export const CALENDAR_EVENT_TEXT_COLOR = '#1e293b'

/**
 * Neutral bar for grouped appointments (2+ services) and for single
 * appointments whose service has no color. "Grey = group" reads the same way
 * here as in the home timeline; the status is conveyed by an icon, not color.
 */
export const CALENDAR_GROUP_NEUTRAL = {
  borderColor: '#94a3b8',
  backgroundColor: '#f1f5f9',
} as const
