---
version: 1.1
date: 2026-07-13
category: practices
---

# API Service Layer

> Version 1.1 · 2026-07-13 · [Practices](../)

## Overview

Every data-access call in this project goes through an **API service function** — a plain async
function that lives in `entity/api/*.api.ts`. Nothing outside of these files may call `supabase`
directly for data operations.

This boundary exists for one reason: when the backend changes (e.g., replacing Supabase with a
custom REST or gRPC API), only the `api/` files need to change. Stores, queries, and components
stay untouched.

---

## Architecture

The data layer has three levels, each with a strict responsibility:

```
┌─────────────────────────────────────────────────────┐
│  Components / Pages / Widgets                        │
│  – call useQuery / useMutation composables only      │
│  – never import from api/ directly                   │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│  model/*.queries.ts  (or stores for session)         │
│  – wraps api functions with @pinia/colada            │
│  – owns cache keys, invalidation, reactive state     │
│  – never calls supabase                              │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│  api/*.api.ts                                        │
│  – the ONLY place supabase.from() / supabase.rpc()  │
│    may appear for data operations                    │
│  – plain async functions, no Vue reactivity          │
│  – throws on error, returns typed data on success    │
└─────────────────────────────────────────────────────┘
```

### Layer rules

| Layer | May import from | Must not import from |
|---|---|---|
| `api/*.api.ts` | `@shared/lib/supabase`, domain types | Vue, Pinia, other entities |
| `model/*.queries.ts` | own `api/`, own `model/types` | `supabase` directly |
| Components | own `model/*.queries.ts`, `model/types` | `api/` directly, `supabase` |

Pinia **stores** follow the same rule as queries: they call API functions, never Supabase directly.
The `session.store.ts` currently violates this — see [Known violation](#known-violation) below.

---

## Writing an API Function

```ts
// src/entities/client/api/clients.api.ts
import { supabase } from '@shared/lib/supabase'
import type { Client, CreateClientDto } from '../model/types'

// 1. Plain async function — no Vue, no reactivity
// 2. Accepts typed input, returns typed output
// 3. Throws on error — the query layer handles retry/error state
// 4. The name describes the operation, not the transport

export async function listClients(userId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from('client')
    .select('*')
    .eq('user_id', userId)
    .order('first_name')
  if (error) throw error
  return data as Client[]
}

export async function createClient(userId: string, dto: CreateClientDto): Promise<Client> {
  const { data, error } = await supabase
    .from('client')
    .insert({ ...dto, user_id: userId })
    .select('*')
    .single()
  if (error) throw error
  return data as Client
}
```

**Rules for API functions:**
- Signature: `(input: TypedInput): Promise<TypedOutput>`
- Always destructure `{ data, error }` and `throw error` immediately if present
- Return the typed result — never return the raw Supabase response object
- No side-effects: no store writes, no toast calls, no navigation
- File: `src/entities/<entity>/api/<entity>.api.ts`

---

## Writing Queries and Mutations

Wrap API functions with `@pinia/colada`'s `useQuery` / `useMutation`:

```ts
// src/entities/client/model/client.queries.ts
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { Ref } from 'vue'
import { createClient, listClients, removeClient } from '../api/clients.api'
import type { CreateClientDto } from './types'

export const useClientsQuery = (userId: Ref<string>) =>
  useQuery({
    key: () => ['clients', userId.value],
    query: () => listClients(userId.value),
  })

export const useCreateClientMutation = (userId: Ref<string>) => {
  const cache = useQueryCache()
  return useMutation({
    mutation: (dto: CreateClientDto) => createClient(userId.value, dto),
    onSettled: () => cache.invalidateQueries({ key: ['clients', userId.value] }),
  })
}
```

**Cache key convention:** `[entityName, ...identifiers]` — e.g. `['clients', userId]`,
`['appointment', appointmentId]`. Keep keys consistent across queries and invalidation calls.

**Loading flags — `isPending` vs `isLoading`:** colada exposes both. In this version
(`@pinia/colada` 1.2):

- `isPending` = `status === 'pending'` → **true only until the first data arrives**.
- `isLoading` = `asyncStatus === 'loading'` → **true on every fetch**, including background
  revalidation after mutations, refocus, or invalidation.

Gate first-load skeletons/placeholders on **`isPending`** so an already-populated list is not
replaced by a preloader every time the query silently revalidates. Reserve `isLoading` for
unobtrusive "refreshing" indicators. Example: the clients list (`ClientsPage.vue`) uses
`isPending` for its skeleton cards.

---

## Migrating to a Custom API

When the time comes to move off Supabase, the change is contained to `api/` files only:

```ts
// Before (Supabase)
export async function listClients(userId: string): Promise<Client[]> {
  const { data, error } = await supabase.from('client').select('*').eq('user_id', userId)
  if (error) throw error
  return data as Client[]
}

// After (custom REST API)
export async function listClients(userId: string): Promise<Client[]> {
  const res = await fetch(`/api/clients?userId=${userId}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<Client[]>
}
```

The query composable, the component, and the cache invalidation logic remain identical. Only
the transport changes.

---

## Known Violation

`src/entities/session/model/session.store.ts` currently calls `supabase.from('master_profile')`
inside `fetchProfile` directly:

```ts
// ❌ Current — Supabase called inside the store
async function fetchProfile(userId: string): Promise<void> {
  const { data } = await supabase
    .from('master_profile')
    .select('id, first_name, last_name')
    .eq('user_id', userId)
    .maybeSingle()
  profile.value = data ?? null
}
```

The correct fix is to extract the query into a dedicated API file:

```ts
// ✅ Target — src/entities/session/api/session.api.ts
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
```

```ts
// ✅ Target — session.store.ts fetchProfile
import { fetchSessionProfile } from '../api/session.api'

async function fetchProfile(userId: string): Promise<void> {
  profile.value = await fetchSessionProfile(userId)
}
```

The store no longer imports or knows about `supabase`.

---

## File Structure

```
src/entities/<entity>/
  api/
    <entity>.api.ts        ← Supabase calls live here exclusively
  model/
    types.ts               ← Domain types shared between api/ and queries
    <entity>.queries.ts    ← @pinia/colada composables
    <entity>.store.ts      ← Pinia stores (if needed beyond queries)
```

Real examples:

| File | Role |
|---|---|
| `src/entities/client/api/clients.api.ts` | CRUD operations against `client` table |
| `src/entities/client/model/client.queries.ts` | Reactive query/mutation composables |
| `src/entities/analytics/api/analytics.api.ts` | RPC call to `get_analytics` |
| `src/entities/master/api/master.api.ts` | Profile + settings fetch, combined via `Promise.all` |

---

## Cross-references

- [Supabase Integration](../integrations/supabase.md) — client setup, env vars, RLS, migration workflow
- [Data Model](../business/data-model.md) — table schemas that the API functions query against
- [Master Entity](../code/master-entity.md) — example of a well-structured entity with api/ and queries layers
- [Clients](../business/clients.md) — client entity queries/mutations and the `isPending` skeleton pattern in practice
