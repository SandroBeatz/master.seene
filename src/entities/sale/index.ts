export type {
  CompleteSaleDto,
  CompleteSaleItemDto,
  Sale,
  SaleItem,
  SalePaymentType,
  UpdateSaleDetailsDto,
  UpdateSaleItemAmountDto,
} from './model/types'
export {
  useSaleByAppointmentQuery,
  useCompleteSaleMutation,
  useUpdateSaleDetailsMutation,
  useUpdateSaleMutation,
} from './model/sale.queries'
