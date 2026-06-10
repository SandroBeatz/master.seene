import { supabase } from '@shared/lib/supabase'
import type { SessionProfile } from '../model/session.store'

export async function fetchSessionProfile(userId: string): Promise<SessionProfile | null> {
  const { data, error } = await supabase
    .from('master_profile')
    .select('id, first_name, last_name')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}
