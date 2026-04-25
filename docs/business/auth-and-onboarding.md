---
version: 1.0
date: 2026-04-25
category: business
---

# Auth & Onboarding Flow

> Version 1.0 · 2026-04-25 · [Business](../)

## Overview

Every user of Seene is a beauty/wellness master. The auth and onboarding flow is the critical path that takes a new user from first visit to a fully configured master profile ready to work with the dashboard.

The flow has two mandatory phases:

1. **Authentication** — register or log in via Supabase Auth.
2. **Onboarding** — a gated, 5-step wizard that must be completed before accessing the dashboard. The router guard enforces this: a master who has not completed onboarding cannot reach `/home` or any dashboard route.

All data collected during onboarding is persisted to the `master_profile` table in Supabase.

---

## Flow Architecture

### High-level user journey

```
Unauthenticated user
        │
        ▼
   /register  ──────────────────────► /login (if already has account)
        │
        │  supabase.auth.signUp (email + password)
        │  ✓ no email confirmation required (disabled in Supabase project settings)
        │
        ▼
   /onboarding  ◄──── ENFORCED: router guard blocks /home until profile created
        │
        │  Step 1: Specializations (multi-select)
        │  Step 2: Personal info
        │  Step 3: Address & work location
        │  Step 4: Schedule & timezone
        │  Step 5: Review & create master_profile
        │
        ▼
   /home  (dashboard — fully operational)
```

### Returning user journey

```
Authenticated user (session exists)
        │
        ├─► visits /login or /register ──► redirect to /home  (guard)
        │
        └─► visits any route
                │
                ├─ onboarding not done ──► /onboarding  (TODO: guard extension)
                └─ onboarding done    ──► allow navigation
```

---

## Authentication

### Current implementation

Only **email + password** is active. Google and Apple OAuth buttons are rendered in the UI but are no-ops (show a toast). They will be wired up in a future milestone.

**Registration** (`/register`, `src/features/auth-register/ui/RegisterForm.vue`):
- Fields: full name, email, password, confirm password.
- Password minimum: 8 characters. Validated client-side with Joi.
- Calls `supabase.auth.signUp({ email, password })`.
- The `name` field is collected for display purposes but **not** passed to Supabase at sign-up time — it will be saved to `master_profile` in onboarding Step 2.
- On success → redirect to `/onboarding`.
- On error → toast with Supabase error message.

**Login** (`/login`, `src/features/auth-login/ui/LoginForm.vue`):
- Fields: email, password.
- Calls `supabase.auth.signInWithPassword({ email, password })`.
- On success → redirect to `/home`.
- On error → toast with Supabase error message.

### Planned (not yet implemented)

| Feature | Notes |
|---|---|
| Email confirmation | Disabled now. Will be enabled in Supabase project settings; requires adding a confirmation-pending state and a `/verify-email` page. |
| Google OAuth | `supabase.auth.signInWithOAuth({ provider: 'google' })` — requires Google Cloud credentials configured in Supabase. |
| Apple OAuth | `supabase.auth.signInWithOAuth({ provider: 'apple' })` — requires Apple Developer setup. |

### Router guard

Defined in `src/app/router/index.ts` via `router.beforeEach`:

```ts
const publicRoutes = ['/login', '/register']

router.beforeEach(async (to) => {
  const { data: { session } } = await supabase.auth.getSession()
  const isPublic = publicRoutes.includes(to.path)

  if (!session && !isPublic) return '/login'      // unauthenticated → login
  if (session && isPublic)   return '/home'       // already logged in → dashboard
})
```

> **TODO:** The guard does not yet check whether onboarding is complete. It must be extended to redirect authenticated users with no `master_profile` record to `/onboarding` before allowing dashboard access.

---

## Onboarding

Onboarding is a **mandatory, linear 5-step wizard**. A user cannot skip steps or access the dashboard until Step 5 is submitted and `master_profile` is created.

The wizard lives under the `/onboarding` route, wrapped in `OnboardingLayout` (`src/widgets/onboarding-layout/`), which is a centered, full-height shell with no sidebar.

All data is held in local state across steps and written to Supabase in a single transaction at Step 5.

### Step 1 — Specializations

The user selects one or more service categories from a fixed list. At least one selection is required.

**Categories (stored as keys):**

| Key | Display (EN) | Display (RU) |
|---|---|---|
| `makeup` | Make-up | Макияж |
| `hair` | Hair | Волосы |
| `nails` | Nails | Ногти |
| `barber` | Barber | Барбер |
| `massage` | Massage | Массаж |
| `tattoo_piercing` | Tattoo and piercing | Тату и пирсинг |
| `depilation` | Depilation | Депиляция |
| `cosmetology` | Cosmetology | Косметология |
| `brows_lashes` | Brows and eyelashes | Брови и ресницы |

**Storage rule:** the `specializations` column in `master_profile` stores an array of keys (e.g. `["nails", "makeup"]`). Display names are resolved at render time from i18n, so client-facing interfaces can show them in any language.

### Step 2 — Personal Info

| Field | Source | Required |
|---|---|---|
| First name | Pre-filled from registration `name` | Yes |
| Last name | Empty, user fills in | Yes |
| Phone number | Empty, user fills in | Yes |
| Username | User chooses; used in personal link URL | Yes, unique |

The username becomes the master's public link: `seene.app/<username>`. Uniqueness must be validated against `master_profile` before allowing step completion.

### Step 3 — Address & Location

The master's work location used for booking and map display.

| Field | Notes |
|---|---|
| City | Free text |
| Street address | Free text |
| ZIP code | Free text |
| Floor | Optional |
| Apartment / office | Optional |
| Entrance code | Optional; shown to clients after booking confirmation |
| Works at my place | Toggle (boolean). If off, address fields may be hidden. |
| Can travel to client | Toggle (boolean). Independent from "works at my place" — both can be on simultaneously. |

### Step 4 — Schedule & Timezone

The master's weekly availability. This becomes the source of truth for booking slot generation.

**Week schedule:** Each day of the week (Monday–Sunday) has:
- An on/off toggle. Disabled days are not available for booking.
- Start time and end time (when the day is on).
- Zero or more **breaks**: each break has a start and end time. Multiple breaks per day are allowed.

**Timezone:** Defaults to the user's browser-detected timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`). The user can override it with a searchable dropdown. All times are stored in the selected timezone; the client-facing booking UI converts to the client's local time.

**Data structure for `master_profile.schedule`:**

```json
{
  "timezone": "Europe/Moscow",
  "days": {
    "monday":    { "enabled": true,  "start": "09:00", "end": "18:00", "breaks": [{ "start": "13:00", "end": "14:00" }] },
    "tuesday":   { "enabled": true,  "start": "09:00", "end": "18:00", "breaks": [] },
    "wednesday": { "enabled": false, "start": null,    "end": null,    "breaks": [] },
    "thursday":  { "enabled": true,  "start": "10:00", "end": "20:00", "breaks": [{ "start": "13:00", "end": "14:00" }, { "start": "17:00", "end": "17:30" }] },
    "friday":    { "enabled": true,  "start": "10:00", "end": "18:00", "breaks": [] },
    "saturday":  { "enabled": true,  "start": "10:00", "end": "15:00", "breaks": [] },
    "sunday":    { "enabled": false, "start": null,    "end": null,    "breaks": [] }
  }
}
```

### Step 5 — Review & Create Profile

A read-only summary of all data entered in Steps 1–4, grouped by section. Each section has an "Edit" link that takes the user back to the relevant step without losing progress.

On "Create profile" button click:
1. Final client-side validation of all collected data.
2. A single `INSERT` into `master_profile` with all fields.
3. On success → redirect to `/home`.
4. On error → toast with error details; the user stays on Step 5.

---

## Data Model

### `master_profile` table

> Note: this table will grow as features are added. The columns below represent the onboarding scope only.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `uuid` | FK → `auth.users.id`, unique (one profile per user) |
| `first_name` | `text` | From Step 2 |
| `last_name` | `text` | From Step 2 |
| `phone` | `text` | From Step 2 |
| `username` | `text` | Unique; used in public profile URL |
| `specializations` | `text[]` | Array of category keys; from Step 1 |
| `city` | `text` | From Step 3 |
| `address` | `text` | From Step 3 |
| `zip_code` | `text` | From Step 3 |
| `floor` | `text` | Optional; from Step 3 |
| `apartment` | `text` | Optional; from Step 3 |
| `entrance_code` | `text` | Optional; from Step 3 |
| `works_at_place` | `boolean` | From Step 3 |
| `can_travel` | `boolean` | From Step 3 |
| `schedule` | `jsonb` | Week schedule with timezone; from Step 4 |
| `created_at` | `timestamptz` | Default `now()` |

---

## Current Implementation Status

| Component | Status | Location |
|---|---|---|
| Email registration | ✅ Done | `src/features/auth-register/ui/RegisterForm.vue` |
| Email login | ✅ Done | `src/features/auth-login/ui/LoginForm.vue` |
| Supabase client | ✅ Done | `src/shared/lib/supabase/client.ts` |
| Router guard (auth) | ✅ Done | `src/app/router/index.ts` |
| Onboarding layout & route | ✅ Done | `src/widgets/onboarding-layout/` |
| Onboarding Step 1 (placeholder) | 🚧 Partial | `src/pages/onboarding/ui/OnboardingStep1Page.vue` — fields wrong, needs redesign per this spec |
| Onboarding Steps 2–5 | ❌ Not built | — |
| Router guard (onboarding gate) | ❌ Not built | Must check `master_profile` existence |
| `master_profile` DB table | ❌ Not built | Supabase migration needed |
| Google / Apple OAuth | ❌ Not built | UI present, logic not wired |
| Email verification | ❌ Not built | Disabled in Supabase settings |

---

## Cross-references

No related docs yet.
