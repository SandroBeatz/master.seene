// Mobile-only slice: the bottom-tab "Menu" hub and its internal Account page.
// There's no desktop counterpart (desktop uses the settings pages), so this
// slice exposes only a mobile public API — no plain index.ts. See
// pages/home/index.mobile.ts for the platform-entry pattern.
export { default as MenuMobilePage } from './ui-mobile/MenuMobilePage.vue'
export { default as MenuAccountPage } from './ui-mobile/MenuAccountPage.vue'
export { default as MenuAppearancePage } from './ui-mobile/MenuAppearancePage.vue'
