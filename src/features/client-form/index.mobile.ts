// Mobile (Ionic) public API for the client-form slice — separate from index.ts
// so the mobile bundle never pulls in the desktop ClientFormDialog (Nuxt UI).
// See pages/clients/index.mobile.ts for the same split pattern.
export { default as ClientFormMobile } from './ui-mobile/ClientFormMobile.vue'
