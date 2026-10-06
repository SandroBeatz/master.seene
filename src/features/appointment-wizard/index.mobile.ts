// Mobile (Ionic) public API for the appointment wizard — separate from index.ts
// so the mobile bundle never pulls in the desktop wizard (Nuxt UI overlay).
export { default as AppointmentWizardMobile } from './ui-mobile/AppointmentWizardMobile.vue'
export type { AppointmentPrefill } from './model/types'
