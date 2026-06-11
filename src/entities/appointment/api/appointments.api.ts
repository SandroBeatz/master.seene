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

export interface AppointmentDayCount {
  /** Calendar day in the master's timezone, formatted as 'YYYY-MM-DD'. */
  day: string
  /** Number of non-cancelled appointments on that day. */
  cnt: number
}

/**
 * Per-day appointment counts for the current user over [from, to), grouped by
 * calendar day in the given timezone. Backed by the `appointment_day_counts` RPC.
 */
export async function listAppointmentDayCounts(
  from: string,
  to: string,
  timeZone: string,
): Promise<AppointmentDayCount[]> {
  const { data, error } = await supabase.rpc('appointment_day_counts', {
    p_from: from,
    p_to: to,
    p_tz: timeZone,
  })
  if (error) throw error
  return (data ?? []) as AppointmentDayCount[]
}

export async function listActionableAppointments(userId: string): Promise<Appointment[]> {
  const now = new Date()
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'confirmed'])
    .order('start_at')
  if (error) throw error

  // Surface pending appointments for any day (they always need action), and
  // confirmed appointments only once their end time (start + duration) has passed.
  const nowMs = now.getTime()
  return (data as Appointment[]).filter((a) => {
    if (a.status === 'pending') return true
    return new Date(a.start_at).getTime() + a.duration * 60_000 <= nowMs
  })
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
