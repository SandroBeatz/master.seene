export type PaymentTypeKind = 'cash' | 'card' | 'custom'

export interface PaymentType {
  id: string
  user_id: string
  name: string
  color: string
  kind: PaymentTypeKind
  is_default: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type CreatePaymentTypeDto = Omit<PaymentType, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type UpdatePaymentTypeDto = Partial<CreatePaymentTypeDto> & { id: string }

/** System methods (cash/card) are seeded automatically and cannot be deleted — only toggled. */
export function isSystemPaymentType(pt: Pick<PaymentType, 'kind'>): boolean {
  return pt.kind !== 'custom'
}
