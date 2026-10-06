// Mobile (Ionic) public API for the register slice — separate from index.ts so
// the mobile bundle never pulls in the desktop RegisterPage (Nuxt UI). See
// pages/home/index.mobile.ts for the pattern.
export { default as RegisterMobilePage } from './ui-mobile/RegisterMobilePage.vue'
