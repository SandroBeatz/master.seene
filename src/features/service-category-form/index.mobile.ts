// Mobile (Ionic) public API for the service-category-form slice — separate from
// index.ts so the mobile bundle never pulls in the desktop
// ServiceCategoryFormModal (Nuxt UI). See features/client-form/index.mobile.ts
// for the same split pattern.
export { default as ServiceCategoryFormMobile } from './ui-mobile/ServiceCategoryFormMobile.vue'
export { default as ServiceCategoryPickerMobile } from './ui-mobile/ServiceCategoryPickerMobile.vue'
