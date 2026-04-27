---
version: 1.0
date: 2026-04-27
category: architecture
---

# Auth Guard & Session Store

> Version 1.0 · 2026-04-27 · [Architecture](../)

## Overview

Every navigation in Seene passes through a Vue Router `beforeEach` guard that enforces three rules:

1. Unauthenticated users can only reach `/login` and `/register`.
2. Authenticated users without a completed `master_profile` are redirected to `/onboarding`.
3. Authenticated users who have completed onboarding are redirected away from auth routes to `/home`.

The guard reads its state from a Pinia session store (`useSessionStore`) backed by Supabase's `onAuthStateChange` listener. This means the Supabase session and profile are fetched **once** per app load — not on every navigation.

---

## Architecture

### Component map

```
src/app/router/index.ts          ← router guard (beforeEach)
    │
    └─► useSessionStore           ← src/entities/session/model/session.store.ts
            │
            ├─ supabase.auth.getSession()      Bootstrap on first init
            ├─ supabase.auth.onAuthStateChange  Keeps session in sync
            └─ supabase.from('master_profile')  Profile fetch (deferred)
```

### Initialization flow

```
App loads → router.beforeEach fires (first navigation)
    │
    ├─ sessionStore.isInitialized == false
    │       │
    │       └─ await sessionStore.init()
    │               │
    │               ├─ 1. Register onAuthStateChange listener
    │               ├─ 2. await supabase.auth.getSession()   ← waits for token refresh
    │               ├─ 3. If session: await fetchProfile(userId)
    │               └─ 4. isInitialized = true
    │
    └─ Guard reads { session, profile } and decides where to redirect
```

### Subsequent navigations

```
router.beforeEach fires
    │
    ├─ sessionStore.isInitialized == true
    │       │
    │       └─ await sessionStore.waitForReady()
    │               │
    │               └─ Awaits _processingPromise if a profile fetch is in flight
    │                  (triggered by a SIGNED_IN event on another tab or just after login)
    │
    └─ Guard reads cached { session, profile } — no Supabase calls
```

---

## Session Store

**File:** `src/entities/session/model/session.store.ts`

The store exposes:

| Member | Type | Description |
|---|---|---|
| `session` | `Ref<Session \| null>` | Current Supabase auth session |
| `profile` | `Ref<SessionProfile \| null>` | Fetched `master_profile` row (`{ id }`) or null if not created yet |
| `isInitialized` | `Ref<boolean>` | True after first `init()` completes |
| `init()` | `() => Promise<void>` | Idempotent — safe to call multiple times; only runs setup once |
| `waitForReady()` | `() => Promise<void>` | Resolves when any in-flight profile fetch is complete |

### Why `onAuthStateChange` + `getSession()`

Supabase recommends subscribing to `onAuthStateChange` **before** calling `getSession()` to avoid missing events that fire during the initial token refresh. However, `getSession()` is still required for the bootstrap because the `INITIAL_SESSION` event can fire before the refresh completes (with a stale or null session). The store subscribes first, then bootstraps via `getSession()`.

### The Supabase auth lock — critical constraint

Supabase's JS client serialises auth operations behind an internal async lock. `onAuthStateChange` **awaits each subscriber callback** inside that lock. This creates a subtle but fatal deadlock:

```
onAuthStateChange fires → lock held
    │
    └─ subscriber callback runs
            │
            └─ supabase.from('master_profile').select(...)
                    │
                    └─ internally calls auth.getSession()
                            │
                            └─ waits to acquire the same lock ← DEADLOCK
```

**The fix:** The `onAuthStateChange` callback is synchronous. Profile fetching is deferred to the next macrotask via `setTimeout(0)`, which runs **after Supabase has released the lock**:

```ts
supabase.auth.onAuthStateChange((event, newSession) => {
  // SYNC ONLY — no supabase.from(), no await, no auth.getSession()
  if (event === 'INITIAL_SESSION') return
  session.value = newSession
  if (event === 'SIGNED_OUT') { profile.value = null; return }

  if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && newSession) {
    const userId = newSession.user.id
    let resolveProcessing!: () => void
    _processingPromise = new Promise<void>((r) => { resolveProcessing = r })

    // Deferred — runs after Supabase releases the auth lock
    setTimeout(async () => {
      await fetchProfile(userId)
      resolveProcessing()
      _processingPromise = null
    }, 0)
  }
})
```

> **Rule:** Never call `supabase.from()`, `supabase.auth.getSession()`, or any async Supabase method directly inside an `onAuthStateChange` callback. Always defer with `setTimeout(0)`.

### The `_processingPromise` pattern

After a `SIGNED_IN` event, the profile fetch runs asynchronously. If the router guard fires before the fetch completes (e.g., the login feature immediately calls `router.push('/home')`), it would see `profile = null` and incorrectly redirect to `/onboarding`.

`_processingPromise` bridges this gap. It is set to a pending promise as soon as `SIGNED_IN` fires, and resolved only when `fetchProfile` completes. The guard awaits `sessionStore.waitForReady()` on every navigation to ensure it never reads a stale `null` profile mid-fetch.

---

## Router Guard

**File:** `src/app/router/index.ts`

```ts
router.beforeEach(async (to) => {
  const sessionStore = useSessionStore()

  if (!sessionStore.isInitialized) {
    await sessionStore.init()
  } else {
    await sessionStore.waitForReady()
  }

  const { session, profile } = sessionStore
  const isAuthRoute = authRoutes.includes(to.path)       // /login, /register
  const isOnboarding = to.path.startsWith('/onboarding')

  // Unauthenticated → only auth routes are accessible
  if (!session && !isAuthRoute) return '/login'

  if (session) {
    // Auth routes while logged in → skip to correct destination
    if (isAuthRoute) return profile ? '/home' : '/onboarding/step1'

    // Dashboard routes require completed onboarding
    if (!isOnboarding && !profile) return '/onboarding/step1'
  }
})
```

### Decision table

| Session | Profile | Target | Outcome |
|---|---|---|---|
| ❌ | any | `/login`, `/register` | Allow |
| ❌ | any | anything else | → `/login` |
| ✅ | ❌ | `/login`, `/register` | → `/onboarding/step1` |
| ✅ | ✅ | `/login`, `/register` | → `/home` |
| ✅ | ❌ | `/onboarding/*` | Allow |
| ✅ | ✅ | `/onboarding/*` | Allow (can revisit) |
| ✅ | ❌ | dashboard routes | → `/onboarding/step1` |
| ✅ | ✅ | dashboard routes | Allow |

---

## Logout

Logout is handled in `DashboardLayout` (`src/widgets/dashboard-layout/ui/DashboardLayout.vue`):

```ts
await supabase.auth.signOut()
router.push('/login')
```

`signOut()` fires a `SIGNED_OUT` event through `onAuthStateChange`. The store's listener sets both `session` and `profile` to `null` synchronously. The subsequent guard execution on `/login` sees no session and allows access.

---

## Cross-references

- [Auth & Onboarding Flow](../business/auth-and-onboarding.md) — business rules, registration, onboarding steps, and email confirmation plan
- [Supabase Integration](../integrations/supabase.md) — Supabase client setup, RLS, schema workflow
- [Data Model](../business/data-model.md) — `master_profile` table schema that the profile fetch queries

## File Structure

| File | Role |
|---|---|
| `src/entities/session/model/session.store.ts` | Session + profile state, `onAuthStateChange` listener, `init()` / `waitForReady()` |
| `src/entities/session/index.ts` | Public API barrel — exports `useSessionStore`, `SessionProfile` |
| `src/app/router/index.ts` | Route definitions + `beforeEach` guard |
| `src/widgets/dashboard-layout/ui/DashboardLayout.vue` | Logout handler |
| `src/shared/lib/supabase/client.ts` | Supabase client singleton |
