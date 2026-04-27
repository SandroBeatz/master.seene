import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@shared/lib/supabase'

export interface SessionProfile {
  id: string
}

export const useSessionStore = defineStore('session', () => {
  const session = ref<Session | null>(null)
  const profile = ref<SessionProfile | null>(null)
  const isInitialized = ref(false)

  let _initPromise: Promise<void> | null = null
  let _processingPromise: Promise<void> | null = null

  async function fetchProfile(userId: string): Promise<void> {
    const { data } = await supabase
      .from('master_profile')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    profile.value = data ?? null
  }

  function waitForReady(): Promise<void> {
    return _processingPromise ?? Promise.resolve()
  }

  function init(): Promise<void> {
    if (_initPromise) return _initPromise

    _initPromise = (async () => {
      // Subscribe BEFORE getSession to avoid missing events.
      //
      // IMPORTANT: This callback must NOT call supabase.from() or auth.getSession()
      // directly. Supabase awaits subscriber callbacks within the auth lock context,
      // so any call that internally needs auth.getSession() (including supabase.from())
      // would deadlock waiting for the same lock.
      //
      // fetchProfile is deferred via setTimeout to escape the lock before running.
      supabase.auth.onAuthStateChange((event, newSession) => {
        if (event === 'INITIAL_SESSION') return

        session.value = newSession

        if (event === 'SIGNED_OUT') {
          profile.value = null
          return
        }

        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && newSession) {
          // Skip during bootstrap — getSession() below already fetches the profile.
          // This prevents a double fetch on page reload when Supabase fires SIGNED_IN
          // alongside the token refresh that happens during init.
          if (!isInitialized.value) return

          const userId = newSession.user.id
          let resolveProcessing!: () => void
          _processingPromise = new Promise<void>((r) => {
            resolveProcessing = r
          })
          // Defer to macrotask — runs after the auth lock is released
          setTimeout(async () => {
            await fetchProfile(userId)
            resolveProcessing()
            _processingPromise = null
          }, 0)
        }
      })

      // Bootstrap: getSession() correctly waits for token refresh to complete.
      // We do this after subscribing so we don't miss events that fire during refresh.
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession()

      session.value = initialSession
      if (initialSession) {
        await fetchProfile(initialSession.user.id)
      }

      isInitialized.value = true
    })()

    return _initPromise
  }

  return { session, profile, isInitialized, init, waitForReady }
})
