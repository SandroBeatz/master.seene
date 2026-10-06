// Mobile public API: expose only the framework-agnostic form state mapper so
// the Ionic bundle never resolves the desktop Nuxt UI component.
export { useBookingSettings } from './model/use-booking-settings'
export type { BookingSettingsState } from './model/use-booking-settings'
