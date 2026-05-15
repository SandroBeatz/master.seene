export interface SaleItem {
  id: string
  sale_id: string
  service_id: string | null
  name_snapshot: string
  price_snapshot: number
}

export interface SalePaymentType {
  name: string
  color: string
}

export interface Sale {
  id: string
  user_id: string
  appointment_id: string
  client_id: string
  payment_type_id: string | null
  amount: number
  paid_at: string
  created_at: string
  payment_type?: SalePaymentType | null
  items?: SaleItem[]
}

export interface CompleteSaleItemDto {
  service_id: string | null
  name: string
  price: number
}

export interface CompleteSaleDto {
  appointment_id: string
  amount: number
  payment_type_id: string
  items: CompleteSaleItemDto[]
}
