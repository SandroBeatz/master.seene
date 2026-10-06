// Ionic-only appointment UI. Keep this barrel separate from index.ts so the
// desktop bundle never pulls in Ionic components.
export { default as AppointmentSlotPickerMobile } from './ui-mobile/AppointmentSlotPickerMobile.vue'
export { default as AppointmentBlockMobile } from './ui-mobile/AppointmentBlockMobile.vue'
export type {
  AppointmentBlockDensity,
  AppointmentBlockService,
} from './ui-mobile/AppointmentBlockMobile.vue'
export { getMobileAppointmentStatusIcon } from './ui-mobile/status-icon'
export type { MobileAppointmentStatusIcon } from './ui-mobile/status-icon'
