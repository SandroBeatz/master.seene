---
version: 1.0
date: 2026-04-26
category: integrations
---

# Supabase Integration

> Version 1.0 · 2026-04-26 · [Integrations](../)

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

The router guard in `src/app/router/index.ts` calls `supabase.auth.getSession()` on every navigation to protect routes.

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

## Files

| Path | Description |
|---|---|
| `src/shared/lib/supabase/client.ts` | Supabase client singleton — import `supabase` from here |
| `supabase/migrations/` | All applied schema migrations in chronological order |
| `.env` | `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` |

### Files that use the Supabase client

| Path | What it does |
|---|---|
| `src/app/router/index.ts` | `supabase.auth.getSession()` — route guard |
| `src/features/auth-login/ui/LoginForm.vue` | `supabase.auth.signInWithPassword()` |
| `src/features/auth-register/ui/RegisterForm.vue` | `supabase.auth.signUp()` |
| `src/pages/onboarding/ui/OnboardingStep2Page.vue` | `.from('master_profile').select()` — username uniqueness check |
| `src/pages/onboarding/ui/OnboardingStep5Page.vue` | `.from('master_profile').insert()` — profile creation |
| `src/widgets/dashboard-layout/ui/DashboardLayout.vue` | `supabase.auth.signOut()` — logout |

---

## Cross-references

- [Data Model](../business/data-model.md) — full schema of all tables, columns, constraints, and RLS policies
- [Auth & Onboarding Flow](../business/auth-and-onboarding.md) — business logic for how auth and profile creation work
