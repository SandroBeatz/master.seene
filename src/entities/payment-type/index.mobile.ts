// Ionic-only payment type UI. Keep this barrel separate from index.ts so the
// reusable picker can be consumed without coupling desktop and mobile UI.
export type { PaymentType, PaymentTypeKind } from './model/types'
export { usePaymentTypesQuery } from './model/payment-type.queries'
export { default as PaymentTypePickerModalMobile } from './ui-mobile/PaymentTypePickerModalMobile.vue'
