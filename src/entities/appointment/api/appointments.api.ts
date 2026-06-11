import { supabase } from '@shared/lib/supabase'
import type { Appointment, CreateAppointmentDto, UpdateAppointmentDto } from '../model/types'

export async function listAppointments(
  userId: string,
  options?: { from?: string; to?: string },
): Promise<Appointment[]> {
  let query = supabase.from('appointments').select('*').eq('user_id', userId).order('start_at')

  if (options?.from) query = query.gte('start_at', options.from)
  if (options?.to) query = query.lte('start_at', options.to)

  const { data, error } = await query
  if (error) throw error
  return data as Appointment[]
}

export async function getAppointmentById(id: string): Promise<Appointment> {
  const { data, error } = await supabase.from('appointments').select('*').eq('id', id).single()
  if (error) throw error
  return data as Appointment
}

export async function createAppointment(
  userId: string,
  dto: CreateAppointmentDto,
): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .insert({ ...dto, user_id: userId })
    .select('*')
    .single()
  if (error) throw error
  return data as Appointment
}

export async function updateAppointment(dto: UpdateAppointmentDto): Promise<Appointment> {
  const { id, ...fields } = dto
  const { data, error } = await supabase
    .from('appointments')
    .update(fields)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as Appointment
}

export async function removeAppointment(id: string): Promise<void> {
  const { error } = await supabase.from('appointments').delete().eq('id', id)
  if (error) throw error
}

export async function listActionableAppointments(userId: string): Promise<Appointment[]> {
  const now = new Date()
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'confirmed'])
    .lt('start_at', now.toISOString())
    .order('start_at')
  if (error) throw error

  // Only surface appointments whose end time (start + duration) has passed
  const nowMs = now.getTime()
  return (data as Appointment[]).filter(
    (a) => new Date(a.start_at).getTime() + a.duration * 60_000 <= nowMs,
  )
}

export async function getNextAppointment(userId: string): Promise<Appointment | null> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'confirmed'])
    .gte('start_at', now)
    .order('start_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as Appointment | null
}
