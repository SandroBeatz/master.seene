// Mobile (Ionic) public API for the settings slice — kept separate from
// index.ts so the mobile bundle never pulls in the desktop settings pages
// (which import Nuxt UI and the full desktop feature graph). This is the
// bottom-tab "Settings" hub and its native sub-pages. See
// pages/home/index.mobile.ts for the platform-entry pattern.
export { default as SettingsMobilePage } from './ui-mobile/SettingsMobilePage.vue'
export { default as SettingsProfilePage } from './ui-mobile/SettingsProfilePage.vue'
export { default as SettingsContactsPage } from './ui-mobile/SettingsContactsPage.vue'
export { default as SettingsWorkingHoursPage } from './ui-mobile/SettingsWorkingHoursPage.vue'
export { default as SettingsBookingPage } from './ui-mobile/SettingsBookingPage.vue'
export { default as SettingsSystemRegionPage } from './ui-mobile/SettingsSystemRegionPage.vue'
export { default as SettingsAccountPage } from './ui-mobile/SettingsAccountPage.vue'
export { default as SettingsPaymentTypesPage } from './ui-mobile/SettingsPaymentTypesPage.vue'
export { default as SettingsServiceCategoriesPage } from './ui-mobile/SettingsServiceCategoriesPage.vue'
