// Mobile (Ionic) public API for the working-hours-form slice — separate from
// index.ts so the mobile bundle never pulls in the desktop WorkingHoursForm.vue
// (Nuxt UI). Only the pure editing/validation composable is shared; the mobile
// screen renders its own native Ionic UI
// (pages/settings/ui-mobile/SettingsWorkingHoursPage.vue).
export { useWorkingHours } from './model/use-working-hours'
export type { WorkingHoursDayView, UseWorkingHours } from './model/use-working-hours'
