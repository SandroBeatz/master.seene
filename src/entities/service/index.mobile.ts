// Ionic-only service UI. Keep this barrel separate from index.ts because the
// desktop service picker depends on Nuxt UI.
export type { Service, ServiceCategory } from './model/types'
export { default as ServicePickerModalMobile } from './ui-mobile/ServicePickerModalMobile.vue'
export {
  useCreateServiceMutation,
  useDeleteServiceMutation,
  useServicesQuery,
  useUpdateServiceMutation,
} from './model/service.queries'
export { default as ServiceSelectListMobile } from './ui-mobile/ServiceSelectListMobile.vue'
export { default as ServiceCategorySegmentMobile } from './ui-mobile/ServiceCategorySegmentMobile.vue'
export { useServiceSelectFilter } from './model/use-service-select-filter'
