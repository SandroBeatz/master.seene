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
