// Mobile (Ionic) public API for the service-form slice — separate from index.ts
// so the mobile bundle never pulls in the desktop ServiceFormModal (Nuxt UI).
// See features/client-form/index.mobile.ts for the same split pattern.
export { default as ServiceFormMobile } from './ui-mobile/ServiceFormMobile.vue'
