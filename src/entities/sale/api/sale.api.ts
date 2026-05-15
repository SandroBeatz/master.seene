import { supabase } from '@shared/lib/supabase'
import type { CompleteSaleDto, Sale, SaleItem } from '../model/types'

export async function completeSale(dto: CompleteSaleDto): Promise<string> {
  const { data, error } = await supabase.rpc('complete_appointment', {
    p_appointment_id: dto.appointment_id,
    p_amount: dto.amount,
    p_payment_type_id: dto.payment_type_id,
    p_items: dto.items,
  })
  if (error) throw error
  return data as string
}

export async function getSaleByAppointmentId(
  appointmentId: string,
): Promise<(Sale & { items: SaleItem[] }) | null> {
  const { data, error } = await supabase
    .from('sale')
    .select('*, payment_type(name, color), items:sale_item(*)')
    .eq('appointment_id', appointmentId)
    .maybeSingle()
  if (error) throw error
  return data as (Sale & { items: SaleItem[] }) | null
}
