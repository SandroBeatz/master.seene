import { supabase } from '@shared/lib/supabase'
import {
  createMasterPreferences,
  normalizeCalendarFirstDay,
  normalizeCalendarSlotStepMinutes,
  normalizeDefaultCalendarView,
  normalizeTimeFormat,
} from '../model/master-preferences'
import type {
  MasterPreferences,
  MasterProfile,
  MasterProfileUpdate,
  MasterSettings,
} from '../model/types'

const MASTER_PROFILE_COLUMNS =
  'id,user_id,first_name,last_name,username,specializations,bio,schedule'

export async function getMasterProfile(userId: string): Promise<MasterProfile | null> {
  if (!userId) return null

  const { data, error } = await supabase
    .from('master_profile')
    .select(MASTER_PROFILE_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data as MasterProfile | null
}

export async function updateMasterProfile(
  userId: string,
  payload: MasterProfileUpdate,
): Promise<MasterProfile> {
  const { data, error } = await supabase
    .from('master_profile')
    .update({
      first_name: payload.first_name,
      last_name: payload.last_name,
      username: payload.username,
      specializations: payload.specializations,
      bio: payload.bio,
    })
    .eq('user_id', userId)
    .select(MASTER_PROFILE_COLUMNS)
    .single()

  if (error) throw error
  return data as MasterProfile
}

/**
 * Checks whether `username` is free. The username belonging to `currentUserId`
 * counts as available (so a master can re-save without changing it).
 */
export async function isUsernameAvailable(
  username: string,
  currentUserId: string,
): Promise<boolean> {
  const normalized = username.trim().toLowerCase()
  if (!normalized) return false

  const { data, error } = await supabase
    .from('master_profile')
    .select('user_id')
    .eq('username', normalized)
    .maybeSingle()

  if (error) throw error
  if (!data) return true
  return data.user_id === currentUserId
}

export async function getMasterSettings(userId: string): Promise<MasterSettings | null> {
  if (!userId) return null

  const { data, error } = await supabase
    .from('master_settings')
    .select(
      'user_id,time_format,calendar_first_day,calendar_slot_step_minutes,default_calendar_view',
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    user_id: data.user_id,
    time_format: normalizeTimeFormat(data.time_format),
    calendar_first_day: normalizeCalendarFirstDay(data.calendar_first_day),
    calendar_slot_step_minutes: normalizeCalendarSlotStepMinutes(data.calendar_slot_step_minutes),
    default_calendar_view: normalizeDefaultCalendarView(data.default_calendar_view),
  }
}

export async function getMasterPreferences(userId: string): Promise<MasterPreferences> {
  const [profile, settings] = await Promise.all([
    getMasterProfile(userId),
    getMasterSettings(userId),
  ])

  return createMasterPreferences(profile, settings)
}
