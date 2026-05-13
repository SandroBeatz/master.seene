export interface PaymentType {
  id: string
  user_id: string
  name: string
  color: string
  is_default: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type CreatePaymentTypeDto = Omit<PaymentType, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type UpdatePaymentTypeDto = Partial<CreatePaymentTypeDto> & { id: string }
