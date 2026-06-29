---
version: 1.2
date: 2026-06-29
category: integrations
---

# Supabase Integration

> Version 1.2 · 2026-06-29 · [Integrations](../)

## Overview

Seene uses [Supabase](https://supabase.com) as its backend platform, providing PostgreSQL database, authentication, and row-level security (RLS). The frontend connects directly to the Supabase REST API using the official `@supabase/supabase-js` client — there is no custom backend server.

**Project:** `foxqkomqtpbxyeqqwzpm` · Region: `ap-southeast-1` (Singapore)

The project does **not** run a local Supabase instance. All changes (schema, data) go directly to the production database, applied either through the Supabase MCP server (for DDL during development) or through the client library (for runtime reads/writes).

---

## Architecture

### Connection

The Supabase client is initialized once in `src/shared/lib/supabase/client.ts` and imported wherever needed:

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

export const supabase = createClient(supabaseUrl, supabaseKey)
```

**Environment variables** (in `.env`):

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Project API URL — e.g. `https://foxqkomqtpbxyeqqwzpm.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key — safe to include in frontend code |

> Never use the `service_role` key in frontend code. It bypasses RLS and must stay server-side only.

### Authentication

Auth is handled entirely by Supabase Auth. The client calls `supabase.auth.*` methods; sessions are managed automatically (stored in `localStorage`).

Active methods: email + password (`signInWithPassword` / `signUp`) and **Google OAuth** (`signInWithOAuth({ provider: 'google' })`, wrapped by `signInWithGoogle()` in the `session` entity). OAuth uses the redirect flow back to the app origin; the session is picked up automatically because `detectSessionInUrl` is on by the client's defaults — no callback route is needed. OAuth providers (Client ID/Secret) are configured in the Supabase Dashboard, **not** in frontend env vars.

The router guard in `src/app/router/index.ts` reads session/profile state from the cached `useSessionStore` (backed by `onAuthStateChange`); it does not call Supabase on every navigation. See [Auth & Onboarding Flow → Google OAuth](../business/auth-and-onboarding.md#google-oauth).

### Data access

All database reads and writes go through the Supabase JS client's query builder:

```ts
// Read
const { data, error } = await supabase
  .from('master_profile')
  .select('id')
  .eq('username', username)
  .maybeSingle()

// Insert
const { error } = await supabase
  .from('master_profile')
  .insert({ user_id: user.id, ...payload })
```

RLS policies on the database ensure that users can only read/write their own rows — no additional authorization logic is needed in the frontend.

---

## Schema Management

### Migration files

Schema changes are version-controlled in `supabase/migrations/`, one file per change, named with a UTC timestamp:

```
supabase/
  migrations/
    20260425000000_initial_schema.sql
    20260426000000_address_redesign.sql
```

**Naming convention:** `YYYYMMDDHHMMSS_snake_case_description.sql`

### Workflow for schema changes

1. **Write the SQL** in a new migration file:
   ```
   supabase/migrations/<timestamp>_<description>.sql
   ```

2. **Apply via Supabase MCP** (`execute_sql` tool, project id `foxqkomqtpbxyeqqwzpm`):
   ```sql
   -- Example: add a column
   ALTER TABLE public.master_profile ADD COLUMN IF NOT EXISTS bio text;
   ```

3. **Commit the migration file** together with any code changes that depend on it:
   ```
   git add supabase/migrations/... src/...
   git commit -m "feat: add bio field to master_profile"
   ```

> **Do not use the `apply_migration` MCP tool.** It expects a running local Supabase instance (`supabase start`), which this project does not use. Always use `execute_sql` for DDL.

### Inspecting the current schema

```sql
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

---

## Row-Level Security

All tables in the `public` schema have RLS enabled. Policies use `auth.uid()` to scope access to the authenticated user's own rows.

Current policy on `master_profile`:

```sql
CREATE POLICY "Users can manage own profile"
  ON public.master_profile
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

This covers SELECT, INSERT, UPDATE, and DELETE — a user can only touch their own profile.

**Security notes:**
- `auth.uid()` returns the authenticated user's ID from the JWT — it cannot be spoofed from the client.
- Do not store authorization data in `raw_user_meta_data` — it is user-editable. Use `raw_app_meta_data` for any server-controlled claims.
- The anon key does not bypass RLS. The service_role key does — never expose it in the client.

---

## Storage

Supabase Storage is used for user-uploaded files. The first (and currently only) bucket is **`avatars`**, holding master profile pictures.

### The `avatars` bucket

- **Public bucket** (`storage.buckets.public = true`). Public buckets serve objects directly through the public storage/CDN endpoint (`supabase.storage.from('avatars').getPublicUrl(path)`), which **bypasses RLS** — so no SELECT policy is needed for clients to *display* an avatar.
- **Path layout:** `<userId>/avatar-<timestamp>.webp`. The leading folder is the owner's `auth.uid()`, which the write policies key off. The timestamp makes each upload a unique object, so replacing an avatar writes a fresh file (the public URL changes, dodging stale CDN caches) rather than overwriting.
- The resolved public URL is stored in `master_profile.avatar_url`; the image bytes live only in Storage. See [Data Model → `master_profile`](../business/data-model.md#master_profile).

### Storage RLS

Policies are on `storage.objects` and are **owner-scoped** — the first path segment must equal the caller's id:

```sql
-- One policy per write verb (INSERT / UPDATE / DELETE) + an owner-scoped SELECT,
-- all for the `authenticated` role:
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
-- "Users can read/update/delete own avatar" follow the same predicate.
```

There is **no broad public SELECT policy** (e.g. `USING (bucket_id = 'avatars')`). A broad select on a public bucket lets clients *list/enumerate* every file and trips the `public_bucket_allows_listing` security advisor — and it's unnecessary because public display already works via the CDN endpoint. The SELECT policy that does exist is owner-scoped, so a master can read back their own objects without exposing the bucket listing.

> **Upsert gotcha (important).** `supabase.storage.from(...).upload(path, file, { upsert: true })` makes Storage run an `INSERT ... ON CONFLICT DO UPDATE`, which under RLS **also requires a SELECT policy** on `storage.objects`. Uploading with `upsert: true` against a bucket that has only INSERT/UPDATE policies fails with `403 — new row violates row-level security policy`. The avatar code avoids this entirely by using unique timestamped filenames and **no upsert** (a plain INSERT), and additionally keeps an owner-scoped SELECT policy. If you add upsert-based uploads, ensure INSERT **+ SELECT + UPDATE** policies all exist.

### Client usage

`src/entities/master/api/master.api.ts` wraps the Storage calls:

```ts
// uploadMasterAvatar(userId, blob): uploads then persists the public URL
const path = `${userId}/avatar-${Date.now()}.webp`
await supabase.storage.from('avatars').upload(path, file, { contentType: 'image/webp' })
const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
await supabase.from('master_profile').update({ avatar_url: publicUrl }).eq('user_id', userId)
```

`removeMasterAvatar(userId)` simply nulls `master_profile.avatar_url` (the orphaned object is left in the owner-scoped bucket). The whole flow is described in [Settings → Profile](../business/settings.md#1-profile-featuresprofile-form).

---

## Files

| Path | Description |
|---|---|
| `src/shared/lib/supabase/client.ts` | Supabase client singleton — import `supabase` from here |
| `supabase/migrations/` | All applied schema migrations in chronological order |
| `.env` | `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` |

### Files that use the Supabase client

| Path | What it does |
|---|---|
| `src/entities/session/api/session.api.ts` | `supabase.auth.signInWithOAuth()` (Google, via `signInWithGoogle`) + `fetchSessionProfile` |
| `src/entities/session/model/session.store.ts` | `supabase.auth.onAuthStateChange()` / `getSession()` — cached session+profile store |
| `src/app/router/index.ts` | reads cached session from the store (no per-navigation Supabase call) |
| `src/features/auth-login/ui/LoginForm.vue` | `supabase.auth.signInWithPassword()` + `signInWithGoogle()` |
| `src/features/auth-register/ui/RegisterForm.vue` | `supabase.auth.signUp()` + `signInWithGoogle()` |
| `src/pages/onboarding/ui/OnboardingStep2Page.vue` | `.from('master_profile').select()` — username uniqueness check |
| `src/pages/onboarding/ui/OnboardingStep5Page.vue` | `.from('master_profile').insert()` — profile creation |
| `src/widgets/dashboard-layout/ui/DashboardLayout.vue` | `supabase.auth.signOut()` — logout |
| `src/entities/master/api/master.api.ts` | `supabase.storage.from('avatars')` — avatar upload/remove (`uploadMasterAvatar` / `removeMasterAvatar`) |

---

## Cross-references

- [Data Model](../business/data-model.md) — full schema of all tables, columns, constraints, and RLS policies
- [Auth & Onboarding Flow](../business/auth-and-onboarding.md) — business logic for how auth and profile creation work
- [Application Settings → Profile](../business/settings.md) — the avatar upload/remove flow that uses the `avatars` Storage bucket
