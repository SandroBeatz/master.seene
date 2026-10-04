// Ionic-only appointment surfaces. The web preview stack depends on Nuxt UI
// and must stay outside the mobile bundle.
export { default as AppointmentDetailsMobile } from './ui-mobile/AppointmentDetailsMobile.vue'
export { default as AppointmentEditMobile } from './ui-mobile/AppointmentEditMobile.vue'
export { default as AppointmentActionsDrawerMobile } from './ui-mobile/AppointmentActionsDrawerMobile.vue'
export {
  getMobileAppointmentFooterAction,
  getMobileAppointmentMenuActions,
  getMobileAppointmentMoreActions,
  type MobileAppointmentFooterAction,
  type MobileAppointmentMenuAction,
  type MobileAppointmentMoreAction,
} from './model/action-set'
