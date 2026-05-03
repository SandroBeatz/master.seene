import { supabase } from '@shared/lib/supabase'
import {
  createMasterPreferences,
  normalizeCalendarFirstDay,
  normalizeCalendarSlotStepMinutes,
  normalizeDefaultCalendarView,
  normalizeTimeFormat,
} from '../model/master-preferences'
import type { MasterPreferences, MasterProfile, MasterSettings } from '../model/types'

export async function getMasterProfile(userId: string): Promise<MasterProfile | null> {
  if (!userId) return null

  const { data, error } = await supabase
    .from('master_profile')
    .select('id,user_id,schedule')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data as MasterProfile | null
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
