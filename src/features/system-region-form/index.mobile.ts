// Mobile (Ionic) public API for the system-region-form slice — separate from
// index.ts so the mobile bundle never pulls in the desktop SystemRegionForm
// (Nuxt UI). Only the pure state-mapping composable is shared; the mobile
// screen renders its own native Ionic UI (pages/settings/ui-mobile).
export { useSystemSettings } from './model/use-system-settings'
export type { SystemSettingsState } from './model/use-system-settings'
