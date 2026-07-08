export { useQuickCreate } from './model/use-quick-create'
export { default as QuickCreateOverlay } from './ui/QuickCreateOverlay.vue'
export type { AppointmentPrefill, QuickCreateMode, TimeOffPrefill } from './model/types'
export {
  appointmentToBusyInterval,
  collectDayBusyIntervals,
  timeBlockToBusyInterval,
  type CollectBusyIntervalsInput,
} from './model/busy-intervals'
export { resolveDayWindow, type DayWindow } from './model/resolve-day-window'
