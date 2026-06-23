import { supabase } from '@shared/lib/supabase'
import {
  createMasterPreferences,
  normalizeAlertUpcomingOffsetMinutes,
  normalizeBookingBufferMinutes,
  normalizeBookingDefaultStatus,
  normalizeBookingMinNoticeMinutes,
  normalizeBool,
  normalizeCalendarFirstDay,
  normalizeCalendarSlotStepMinutes,
  normalizeClientReminderOffsets,
  normalizeCurrency,
  normalizeDateFormat,
  normalizeDefaultCalendarView,
  normalizeLanguage,
  normalizeOnlineBookingEnabled,
  normalizeTheme,
  normalizeTimeFormat,
  DEFAULT_ALERT_AWAITING_CONFIRMATION_ENABLED,
  DEFAULT_ALERT_CANCELLATION_ENABLED,
  DEFAULT_ALERT_NEW_BOOKING_ENABLED,
  DEFAULT_ALERT_UPCOMING_APPOINTMENT_ENABLED,
  DEFAULT_CLIENT_REMINDER_WHATSAPP_ENABLED,
} from '../model/master-preferences'
import type {
  MasterBookingSettingsUpdate,
  MasterContactsUpdate,
  MasterNotificationSettingsUpdate,
  MasterPreferences,
  MasterProfile,
  MasterProfileUpdate,
  MasterSchedule,
  MasterSettings,
  MasterSystemSettingsUpdate,
} from '../model/types'

const MASTER_SETTINGS_COLUMNS =
  'user_id,time_format,calendar_first_day,calendar_slot_step_minutes,default_calendar_view,language,theme,currency,date_format,online_booking_enabled,booking_default_status,booking_buffer_minutes,booking_min_notice_minutes,client_reminder_whatsapp_enabled,client_reminder_offsets_minutes,alert_new_booking_enabled,alert_awaiting_confirmation_enabled,alert_cancellation_enabled,alert_upcoming_appointment_enabled,alert_upcoming_offset_minutes'

function toMasterSettings(data: Record<string, unknown>): MasterSettings {
  return {
    user_id: data.user_id as string,
    time_format: normalizeTimeFormat(data.time_format),
    calendar_first_day: normalizeCalendarFirstDay(data.calendar_first_day),
    calendar_slot_step_minutes: normalizeCalendarSlotStepMinutes(data.calendar_slot_step_minutes),
    default_calendar_view: normalizeDefaultCalendarView(data.default_calendar_view),
    language: normalizeLanguage(data.language),
    theme: normalizeTheme(data.theme),
    currency: normalizeCurrency(data.currency),
    date_format: normalizeDateFormat(data.date_format),
    online_booking_enabled: normalizeOnlineBookingEnabled(data.online_booking_enabled),
    booking_default_status: normalizeBookingDefaultStatus(data.booking_default_status),
    booking_buffer_minutes: normalizeBookingBufferMinutes(data.booking_buffer_minutes),
    booking_min_notice_minutes: normalizeBookingMinNoticeMinutes(data.booking_min_notice_minutes),
    client_reminder_whatsapp_enabled: normalizeBool(
      data.client_reminder_whatsapp_enabled,
      DEFAULT_CLIENT_REMINDER_WHATSAPP_ENABLED,
    ),
    client_reminder_offsets_minutes: normalizeClientReminderOffsets(
      data.client_reminder_offsets_minutes,
    ),
    alert_new_booking_enabled: normalizeBool(
      data.alert_new_booking_enabled,
      DEFAULT_ALERT_NEW_BOOKING_ENABLED,
    ),
    alert_awaiting_confirmation_enabled: normalizeBool(
      data.alert_awaiting_confirmation_enabled,
      DEFAULT_ALERT_AWAITING_CONFIRMATION_ENABLED,
    ),
    alert_cancellation_enabled: normalizeBool(
      data.alert_cancellation_enabled,
      DEFAULT_ALERT_CANCELLATION_ENABLED,
    ),
    alert_upcoming_appointment_enabled: normalizeBool(
      data.alert_upcoming_appointment_enabled,
      DEFAULT_ALERT_UPCOMING_APPOINTMENT_ENABLED,
    ),
    alert_upcoming_offset_minutes: normalizeAlertUpcomingOffsetMinutes(
      data.alert_upcoming_offset_minutes,
    ),
  }
}

const MASTER_PROFILE_COLUMNS =
  'id,user_id,first_name,last_name,username,specializations,bio,avatar_url,schedule,phone,whatsapp,telegram,instagram,tiktok,contact_email,country,address,house_number,zip_code,city,place_id,works_at_place,can_travel'

const AVATAR_BUCKET = 'avatars'

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
 * Uploads a new avatar for the master and persists its public URL.
 *
 * The file is stored at `<userId>/avatar-<timestamp>.webp`. The timestamped name
 * is deliberate: replacing an avatar writes a fresh object instead of overwriting
 * the old one, so the public CDN URL changes and clients don't see a stale cached
 * image. RLS ("Users can ... own avatar") allows writes only under the user's own
 * `<uid>/` folder. Returns the public URL now stored on the profile.
 */
export async function uploadMasterAvatar(userId: string, file: Blob): Promise<string> {
  const path = `${userId}/avatar-${Date.now()}.webp`

  // No upsert: the timestamped path is unique, so this is always a fresh INSERT.
  // (An upsert would run INSERT ... ON CONFLICT DO UPDATE, which under RLS also
  // needs a SELECT policy on storage.objects — avoided by never conflicting.)
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: 'image/webp' })

  if (uploadError) throw uploadError

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)

  const { error: updateError } = await supabase
    .from('master_profile')
    .update({ avatar_url: publicUrl })
    .eq('user_id', userId)

  if (updateError) throw updateError

  return publicUrl
}

/**
 * Clears the master's avatar by nulling `avatar_url`. The orphaned storage object
 * is left in place (cheap, and the bucket is owner-scoped) — physical cleanup is
 * out of scope here.
 */
export async function removeMasterAvatar(userId: string): Promise<void> {
  const { error } = await supabase
    .from('master_profile')
    .update({ avatar_url: null })
    .eq('user_id', userId)

  if (error) throw error
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

/**
 * Persists the Notification settings. Upserts on the unique `user_id` (same
 * rationale as `updateMasterBookingSettings`: some masters have no
 * master_settings row until they touch a setting). RLS "Users can manage own
 * settings" covers insert/update/select.
 */
export async function updateMasterNotificationSettings(
  userId: string,
  payload: MasterNotificationSettingsUpdate,
): Promise<MasterSettings> {
  const { data, error } = await supabase
    .from('master_settings')
    .upsert(
      {
        user_id: userId,
        client_reminder_whatsapp_enabled: payload.client_reminder_whatsapp_enabled,
        client_reminder_offsets_minutes: payload.client_reminder_offsets_minutes,
        alert_new_booking_enabled: payload.alert_new_booking_enabled,
        alert_awaiting_confirmation_enabled: payload.alert_awaiting_confirmation_enabled,
        alert_cancellation_enabled: payload.alert_cancellation_enabled,
        alert_upcoming_appointment_enabled: payload.alert_upcoming_appointment_enabled,
        alert_upcoming_offset_minutes: payload.alert_upcoming_offset_minutes,
      },
      { onConflict: 'user_id' },
    )
    .select(MASTER_SETTINGS_COLUMNS)
    .single()

  if (error) throw error
  return toMasterSettings(data)
}

/**
 * Persists the System & region settings (language, theme, currency, date format,
 * time format, calendar first day / slot step / default view). Upserts on the
 * unique `user_id` (same rationale as `updateMasterBookingSettings`). Time zone
 * is NOT saved here — it lives in profile.schedule.timezone and is persisted via
 * the schedule mutation. RLS "Users can manage own settings" covers
 * insert/update/select.
 */
export async function updateMasterSystemSettings(
  userId: string,
  payload: MasterSystemSettingsUpdate,
): Promise<MasterSettings> {
  const { data, error } = await supabase
    .from('master_settings')
    .upsert(
      {
        user_id: userId,
        language: payload.language,
        theme: payload.theme,
        currency: payload.currency,
        date_format: payload.date_format,
        time_format: payload.time_format,
        calendar_first_day: payload.calendar_first_day,
        calendar_slot_step_minutes: payload.calendar_slot_step_minutes,
        default_calendar_view: payload.default_calendar_view,
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
