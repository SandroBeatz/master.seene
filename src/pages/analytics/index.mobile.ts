// Mobile (Ionic) public API for the analytics slice — separate from index.ts so
// the mobile bundle never pulls in the desktop AnalyticsPage (Nuxt UI). See
// pages/home/index.mobile.ts for the pattern.
export { default as AnalyticsMobilePage } from './ui-mobile/AnalyticsMobilePage.vue'
