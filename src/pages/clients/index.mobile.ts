// Mobile (Ionic) public API for the clients slice — separate from index.ts so
// the mobile bundle never pulls in the desktop ClientsPage/ClientDetailPage
// (Nuxt UI + widgets/features). See pages/home/index.mobile.ts.
export { default as ClientsMobilePage } from './ui-mobile/ClientsMobilePage.vue'
export { default as ClientDetailMobilePage } from './ui-mobile/ClientDetailMobilePage.vue'
