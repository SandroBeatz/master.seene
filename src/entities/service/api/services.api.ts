import { supabase } from '@shared/lib/supabase'
import type { CreateServiceDto, Service, UpdateServiceDto } from '../model/types'

export async function listServices(userId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('service')
    .select('*, category:service_category(id, name)')
    .eq('user_id', userId)
    .order('sort_order')
  if (error) throw error
  return data as Service[]
}

export async function createService(userId: string, dto: CreateServiceDto): Promise<Service> {
  const { data, error } = await supabase
    .from('service')
    .insert({ ...dto, user_id: userId })
    .select('*, category:service_category(id, name)')
    .single()
  if (error) throw error
  return data as Service
}

export async function updateService(dto: UpdateServiceDto): Promise<Service> {
  const { id, ...fields } = dto
  const { data, error } = await supabase
    .from('service')
    .update(fields)
    .eq('id', id)
    .select('*, category:service_category(id, name)')
    .single()
  if (error) throw error
  return data as Service
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase.from('service').delete().eq('id', id)
  if (error) throw error
}
