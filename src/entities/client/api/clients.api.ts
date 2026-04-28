import { supabase } from '@shared/lib/supabase'
import type { Client, CreateClientDto, UpdateClientDto } from '../model/types'

export async function listClients(userId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from('client')
    .select('*')
    .eq('user_id', userId)
    .order('first_name')
  if (error) throw error
  return data as Client[]
}

export async function getClientById(id: string): Promise<Client> {
  const { data, error } = await supabase
    .from('client')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Client
}

export async function createClient(userId: string, dto: CreateClientDto): Promise<Client> {
  const { data, error } = await supabase
    .from('client')
    .insert({ ...dto, user_id: userId })
    .select('*')
    .single()
  if (error) throw error
  return data as Client
}

export async function updateClient(dto: UpdateClientDto): Promise<Client> {
  const { id, ...fields } = dto
  const { data, error } = await supabase
    .from('client')
    .update(fields)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as Client
}

export async function removeClient(id: string): Promise<void> {
  const { error } = await supabase.from('client').delete().eq('id', id)
  if (error) throw error
}
