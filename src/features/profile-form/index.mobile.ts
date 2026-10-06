// Mobile (Ionic) public API for the profile-form slice — separate from index.ts
// so the mobile bundle never pulls in the desktop ProfileForm.vue (Nuxt UI).
// Only the pure specialization catalogue is shared; the mobile screen renders
// its own native Ionic UI (pages/settings/ui-mobile/SettingsProfilePage.vue).
export { SPECIALIZATION_CODES } from './config/specializations'
export type { SpecializationCode } from './config/specializations'
