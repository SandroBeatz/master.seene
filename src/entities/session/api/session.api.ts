import type { AuthError } from '@supabase/supabase-js'
import { supabase } from '@shared/lib/supabase'
import type { SessionProfile } from '../model/session.store'

/**
 * Start the Google OAuth redirect flow. The browser leaves to Google and
 * returns to `window.location.origin`; the session is then picked up
 * automatically (detectSessionInUrl) and the router guard routes the user
 * (new master → onboarding, existing → /home).
 *
 * Returns the auth error (if any) so the caller can surface it; on success
 * the page navigates away before this resolves.
 */
export async function signInWithGoogle(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  return { error }
}

export async function fetchSessionProfile(userId: string): Promise<SessionProfile | null> {
  const { data, error } = await supabase
    .from('master_profile')
    .select('id, first_name, last_name, username, avatar_url, deactivated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}
