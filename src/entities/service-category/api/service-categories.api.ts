import { supabase } from '@shared/lib/supabase'
import type { ServiceCategory } from '../model/types'

export async function listServiceCategories(userId: string): Promise<ServiceCategory[]> {
  const { data, error } = await supabase
    .from('service_category')
    .select('id, name')
    .eq('user_id', userId)
    .order('sort_order')
  if (error) throw error
  return data as ServiceCategory[]
}
