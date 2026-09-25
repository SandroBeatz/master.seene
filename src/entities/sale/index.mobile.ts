// Ionic-only sale UI. Keep this barrel separate from index.ts so mobile
// components never pull a future desktop sale UI into the Ionic bundle.
export type { Sale, SaleItem, UpdateSaleDetailsDto, UpdateSaleItemAmountDto } from './model/types'
export { default as SaleAmountEditorModalMobile } from './ui-mobile/SaleAmountEditorModalMobile.vue'
