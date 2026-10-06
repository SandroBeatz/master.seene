// Mobile (Ionic) public API for the services slice — kept separate from
// index.ts so the mobile bundle never pulls in the desktop ServicesPage (which
// imports Nuxt UI and the desktop feature graph). See
// pages/clients/index.mobile.ts for the same split pattern.
export { default as ServicesMobilePage } from './ui-mobile/ServicesMobilePage.vue'
