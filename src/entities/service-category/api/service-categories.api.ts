import { supabase } from '@shared/lib/supabase'
import type {
  CreateServiceCategoryDto,
  ServiceCategory,
  UpdateServiceCategoryDto,
} from '../model/types'

export async function listServiceCategories(userId: string): Promise<ServiceCategory[]> {
  const { data, error } = await supabase
    .from('service_category')
    .select('id, name')
    .eq('user_id', userId)
    .order('sort_order')
  if (error) throw error
  return data as ServiceCategory[]
}

export async function createServiceCategory(
  userId: string,
  dto: CreateServiceCategoryDto,
): Promise<ServiceCategory> {
  // Append new categories to the end of the list.
  const { count, error: countError } = await supabase
    .from('service_category')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (countError) throw countError

  const { data, error } = await supabase
    .from('service_category')
    .insert({ name: dto.name, user_id: userId, sort_order: count ?? 0 })
    .select('id, name')
    .single()
  if (error) throw error
  return data as ServiceCategory
}

export async function updateServiceCategory(
  dto: UpdateServiceCategoryDto,
): Promise<ServiceCategory> {
  const { data, error } = await supabase
    .from('service_category')
    .update({ name: dto.name })
    .eq('id', dto.id)
    .select('id, name')
    .single()
  if (error) throw error
  return data as ServiceCategory
}

export async function deleteServiceCategory(id: string): Promise<void> {
  // service.category_id has ON DELETE SET NULL, so linked services are
  // automatically unassigned (they fall back to the "All" bucket).
  const { error } = await supabase.from('service_category').delete().eq('id', id)
  if (error) throw error
}
