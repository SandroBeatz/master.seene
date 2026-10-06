// Mobile (Ionic) public API — separate from index.ts, whose desktop calendar
// widgets are built on Nuxt UI and must stay out of the mobile bundle.
export { default as CalendarMobile } from './ui-mobile/CalendarMobile.vue'
export { default as CalendarViewMenuMobile } from './ui-mobile/CalendarViewMenuMobile.vue'
export { default as CalendarJumpSheetMobile } from './ui-mobile/CalendarJumpSheetMobile.vue'
export {
  formatMobileCalendarTitle,
  isCurrentCalendarPeriod,
  type MobileCalendarTitle,
} from './model/calendar-mobile-title'
export { readStoredMobileCalendarView, storeMobileCalendarView } from './model/calendar-mobile'
export type { CalendarDateRange, CalendarViewType } from './model/calendar-controls'
