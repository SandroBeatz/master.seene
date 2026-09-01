// Mobile (Ionic) public API for the calendar slice — separate from index.ts so
// the mobile bundle never pulls in the desktop CalendarPage (Nuxt UI). See
// pages/home/index.mobile.ts for the pattern.
export { default as CalendarMobilePage } from './ui-mobile/CalendarMobilePage.vue'
