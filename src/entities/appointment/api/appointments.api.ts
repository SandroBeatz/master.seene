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

// How far back a past confirmed appointment stays in the "ready to check out"
// feed. Beyond this it drops out of the widget so old un-closed records don't
// pile up forever (the row itself stays in the DB).
const CHECKOUT_WINDOW_DAYS = 14

export async function listActionableAppointments(userId: string): Promise<Appointment[]> {
  const now = new Date()
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'confirmed'])
    .order('start_at')
  if (error) throw error

  // Surface every pending appointment (they always need a response or a
  // decision), and confirmed ones only once their end time has passed and they
  // still fall within the checkout window.
  const nowMs = now.getTime()
  const windowStartMs = nowMs - CHECKOUT_WINDOW_DAYS * 24 * 60 * 60 * 1000
  return (data as Appointment[]).filter((a) => {
    if (a.status === 'pending') return true
    const endMs = new Date(a.start_at).getTime() + a.duration * 60_000
    return endMs <= nowMs && endMs >= windowStartMs
  })
}

/**
 * Total number of appointments for a client (any status). Used to flag a
 * "new client" in the appointment preview — `count <= 1` means this is their
 * only appointment, i.e. their first visit. Uses a head-only `count: 'exact'`
 * request so no rows are transferred.
 */
export async function countClientAppointments(clientId: string): Promise<number> {
  const { count, error } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
  if (error) throw error
  return count ?? 0
}

/**
 * All appointments belonging to a client, any status, newest first. Used by the
 * client preview to render their appointment history and to derive the last
 * visit date.
 */
export async function listClientAppointments(clientId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('client_id', clientId)
    .order('start_at', { ascending: false })
  if (error) throw error
  return data as Appointment[]
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
