// Mobile (Ionic) public API for the login slice — separate from index.ts so the
// mobile bundle never pulls in the desktop LoginPage (Nuxt UI). See
// pages/home/index.mobile.ts for the pattern.
export { default as LoginMobilePage } from './ui-mobile/LoginMobilePage.vue'
