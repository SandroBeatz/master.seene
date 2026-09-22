// Ionic-only appointment surfaces. The web preview stack depends on Nuxt UI
// and must stay outside the mobile bundle.
export { default as AppointmentDetailsMobile } from './ui-mobile/AppointmentDetailsMobile.vue'
export { default as AppointmentEditMobile } from './ui-mobile/AppointmentEditMobile.vue'
export { default as AppointmentActionsDrawerMobile } from './ui-mobile/AppointmentActionsDrawerMobile.vue'
export {
  getMobileAppointmentFooterActions,
  getMobileAppointmentMoreActions,
  type MobileAppointmentFooterActions,
  type MobileAppointmentMoreAction,
  type MobileAppointmentPrimaryAction,
} from './model/action-set'
