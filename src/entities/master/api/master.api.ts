import { supabase } from '@shared/lib/supabase'
import {
  createMasterPreferences,
  normalizeBookingBufferMinutes,
  normalizeBookingDefaultStatus,
  normalizeBookingMinNoticeMinutes,
  normalizeCalendarFirstDay,
  normalizeCalendarSlotStepMinutes,
  normalizeDefaultCalendarView,
  normalizeOnlineBookingEnabled,
  normalizeTimeFormat,
} from '../model/master-preferences'
import type {
  MasterBookingSettingsUpdate,
  MasterContactsUpdate,
  MasterPreferences,
  MasterProfile,
  MasterProfileUpdate,
  MasterSchedule,
  MasterSettings,
} from '../model/types'

const MASTER_SETTINGS_COLUMNS =
  'user_id,time_format,calendar_first_day,calendar_slot_step_minutes,default_calendar_view,online_booking_enabled,booking_default_status,booking_buffer_minutes,booking_min_notice_minutes'

function toMasterSettings(data: Record<string, unknown>): MasterSettings {
  return {
    user_id: data.user_id as string,
    time_format: normalizeTimeFormat(data.time_format),
    calendar_first_day: normalizeCalendarFirstDay(data.calendar_first_day),
    calendar_slot_step_minutes: normalizeCalendarSlotStepMinutes(data.calendar_slot_step_minutes),
    default_calendar_view: normalizeDefaultCalendarView(data.default_calendar_view),
    online_booking_enabled: normalizeOnlineBookingEnabled(data.online_booking_enabled),
    booking_default_status: normalizeBookingDefaultStatus(data.booking_default_status),
    booking_buffer_minutes: normalizeBookingBufferMinutes(data.booking_buffer_minutes),
    booking_min_notice_minutes: normalizeBookingMinNoticeMinutes(data.booking_min_notice_minutes),
  }
}

const MASTER_PROFILE_COLUMNS =
  'id,user_id,first_name,last_name,username,specializations,bio,schedule,phone,whatsapp,telegram,instagram,tiktok,contact_email,country,address,house_number,zip_code,city,place_id,works_at_place,can_travel'

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

export async function updateMasterContacts(
  userId: string,
  payload: MasterContactsUpdate,
): Promise<MasterProfile> {
  const { data, error } = await supabase
    .from('master_profile')
    .update({
      phone: payload.phone,
      whatsapp: payload.whatsapp,
      telegram: payload.telegram,
      instagram: payload.instagram,
      tiktok: payload.tiktok,
      contact_email: payload.contact_email,
      country: payload.country,
      address: payload.address,
      house_number: payload.house_number,
      zip_code: payload.zip_code,
      city: payload.city,
      place_id: payload.place_id,
      works_at_place: payload.works_at_place,
      can_travel: payload.can_travel,
    })
    .eq('user_id', userId)
    .select(MASTER_PROFILE_COLUMNS)
    .single()

  if (error) throw error
  return data as MasterProfile
}

export async function updateMasterSchedule(
  userId: string,
  schedule: MasterSchedule,
): Promise<MasterProfile> {
  const { data, error } = await supabase
    .from('master_profile')
    .update({ schedule })
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
    .select(MASTER_SETTINGS_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return toMasterSettings(data)
}

/**
 * Persists the Booking settings. Uses upsert on the unique `user_id` so the
 * first save creates the master_settings row if one doesn't exist yet (some
 * masters have no row until they touch a setting). RLS policy "Users can manage
 * own settings" (FOR ALL, auth.uid() = user_id) covers insert/update/select.
 */
export async function updateMasterBookingSettings(
  userId: string,
  payload: MasterBookingSettingsUpdate,
): Promise<MasterSettings> {
  const { data, error } = await supabase
    .from('master_settings')
    .upsert(
      {
        user_id: userId,
        online_booking_enabled: payload.online_booking_enabled,
        booking_default_status: payload.booking_default_status,
        booking_buffer_minutes: payload.booking_buffer_minutes,
        booking_min_notice_minutes: payload.booking_min_notice_minutes,
      },
      { onConflict: 'user_id' },
    )
    .select(MASTER_SETTINGS_COLUMNS)
    .single()

  if (error) throw error
  return toMasterSettings(data)
}

export async function getMasterPreferences(userId: string): Promise<MasterPreferences> {
  const [profile, settings] = await Promise.all([
    getMasterProfile(userId),
    getMasterSettings(userId),
  ])

  return createMasterPreferences(profile, settings)
}
