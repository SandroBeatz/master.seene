// Mobile (Ionic) public API for the payment-type-form slice — separate from
// index.ts so the mobile bundle never pulls in the desktop PaymentTypeFormModal
// (Nuxt UI). See features/service-form/index.mobile.ts for the same split.
export { default as PaymentTypeFormMobile } from './ui-mobile/PaymentTypeFormMobile.vue'
