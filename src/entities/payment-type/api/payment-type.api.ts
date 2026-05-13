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
  const { error } = await supabase.from('payment_type').delete().eq('id', id).eq('is_default', false)
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

export async function ensureDefaultPaymentType(userId: string): Promise<void> {
  const { data } = await supabase
    .from('payment_type')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
  if (data && data.length === 0) {
    await supabase.from('payment_type').insert({
      user_id: userId,
      name: 'Наличка',
      color: '#4ade80',
      is_default: true,
      sort_order: 0,
    })
  }
}
