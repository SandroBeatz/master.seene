import { supabase } from '@shared/lib/supabase'
import type { CreatePaymentTypeDto, PaymentType, UpdatePaymentTypeDto } from '../model/types'

export async function listPaymentTypes(userId: string): Promise<PaymentType[]> {
  const { data, error } = await supabase
    .from('payment_type')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order')
    .order('name')
  if (error) throw error
  return data as PaymentType[]
}

export async function createPaymentType(userId: string, dto: CreatePaymentTypeDto): Promise<PaymentType> {
  const { data, error } = await supabase
    .from('payment_type')
    .insert({ ...dto, user_id: userId })
    .select('*')
    .single()
  if (error) throw error
  return data as PaymentType
}

export async function updatePaymentType(dto: UpdatePaymentTypeDto): Promise<PaymentType> {
  const { id, ...fields } = dto
  const { data, error } = await supabase
    .from('payment_type')
    .update(fields)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as PaymentType
}

export async function deletePaymentType(id: string): Promise<void> {
  // Only custom methods are deletable; system methods (cash/card) are protected here and in the UI.
  const { error } = await supabase.from('payment_type').delete().eq('id', id).eq('kind', 'custom')
  if (error) throw error
}

export async function setPaymentTypeActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('payment_type').update({ is_active: isActive }).eq('id', id)
  if (error) throw error
}

export async function updatePaymentTypeSortOrders(
  items: Array<{ id: string; sort_order: number }>,
): Promise<void> {
  for (const item of items) {
    const { error } = await supabase
      .from('payment_type')
      .update({ sort_order: item.sort_order })
      .eq('id', item.id)
    if (error) throw error
  }
}

/**
 * Guarantees the two system methods (cash + card) exist for the user.
 * Idempotent: only inserts the methods that are missing, so repeated calls do nothing.
 */
export async function ensureSystemPaymentTypes(userId: string): Promise<void> {
  const { data } = await supabase
    .from('payment_type')
    .select('kind')
    .eq('user_id', userId)
    .in('kind', ['cash', 'card'])

  const kinds = new Set((data ?? []).map((row) => row.kind))
  const toInsert: Array<Omit<PaymentType, 'id' | 'created_at' | 'updated_at'>> = []

  if (!kinds.has('cash')) {
    toInsert.push({
      user_id: userId,
      name: 'Cash',
      color: '#94a3b8',
      kind: 'cash',
      is_default: true,
      is_active: true,
      sort_order: 0,
    })
  }
  if (!kinds.has('card')) {
    toInsert.push({
      user_id: userId,
      name: 'Card',
      color: '#94a3b8',
      kind: 'card',
      is_default: false,
      is_active: true,
      sort_order: 1,
    })
  }

  if (toInsert.length > 0) {
    await supabase.from('payment_type').insert(toInsert)
  }
}
