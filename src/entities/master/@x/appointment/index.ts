// Cross-import surface for the appointment entity (FSD @x pattern).
// Exposes only what appointment availability needs from the master schedule.
export { resolveDayWindow } from '../../model/resolve-day-window'
export type { DayWindow } from '../../model/resolve-day-window'
export { classifyDayState } from '../../model/classify-day-state'
export type { DayState } from '../../model/classify-day-state'
export type { MasterSchedule } from '../../model/types'
