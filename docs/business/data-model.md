---
version: 1.0
date: 2026-04-26
category: business
---

# Data Model

> Version 1.0 · 2026-04-26 · [Business](../)

## Overview

Seene's database lives in Supabase PostgreSQL (project `foxqkomqtpbxyeqqwzpm`). Currently there is one application table: `master_profile`. It holds everything about a beauty/wellness master — their identity, contact info, service location, and weekly schedule.

The table is populated in a single `INSERT` at the end of the onboarding wizard (Step 5). It is the source of truth for the master's public profile and for booking slot generation.

---

## `master_profile`

### Current schema

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | NO | — | FK → `auth.users.id`; one profile per auth user |
| `first_name` | `text` | NO | — | From onboarding Step 2 |
| `last_name` | `text` | NO | — | From onboarding Step 2 |
| `phone` | `text` | NO | — | International format, from Step 2 |
| `username` | `text` | NO | — | Unique; forms public URL `seene.app/<username>` |
| `specializations` | `text[]` | NO | — | Array of category keys (see below) |
| `country` | `text` | NO | `''` | ISO 3166-1 alpha-2 code or full country name |
| `address` | `text` | YES | `null` | Street address, optional |
| `house_number` | `text` | YES | `null` | House/building number, optional |
| `zip_code` | `text` | YES | `null` | Postal code, optional |
| `city` | `text` | YES | `null` | City name, optional |
| `works_at_place` | `boolean` | NO | `true` | Master accepts clients at their own address |
| `can_travel` | `boolean` | NO | `false` | Master can travel to client's location |
| `schedule` | `jsonb` | NO | — | Weekly schedule with timezone (see structure below) |
| `created_at` | `timestamptz` | NO | `now()` | Row creation timestamp |

### Constraints & indexes

| Name | Type | Columns | Description |
|---|---|---|---|
| `master_profile_pkey` | PRIMARY KEY | `id` | Unique row identifier |
| `master_profile_username_key` | UNIQUE | `username` | Enforces username uniqueness globally |
| `master_profile_user_id_unique` | UNIQUE | `user_id` | One profile per auth user |
| `master_profile_user_id_fkey` | FOREIGN KEY | `user_id → auth.users.id` | Cascades on auth user deletion |

### Row-Level Security

RLS is **enabled**. One policy covers all operations:

```sql
CREATE POLICY "Users can manage own profile"
  ON public.master_profile
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

A user can SELECT, INSERT, UPDATE, and DELETE only their own row. No other user (or anonymous request) can access it.

---

## Field Details

### `specializations` — `text[]`

Array of service category keys. Order is not significant. Validated client-side to require at least one value.

| Key | Display EN | Display RU |
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

Display names are resolved at render time from i18n — only the keys are stored in the database.

### `country`

Set by the user in onboarding Step 3. Stored as an ISO 3166-1 alpha-2 code (e.g. `"FR"`, `"US"`) or as a full country name depending on the picker selection. Used by the frontend to auto-detect the preferred time format (12h vs 24h) for schedule display.

### `schedule` — `jsonb`

Stores the master's full weekly availability. Structure:

```json
{
  "timezone": "Europe/Paris",
  "days": {
    "monday":    { "enabled": true,  "start": "09:00", "end": "18:00", "breaks": [{ "start": "13:00", "end": "14:00" }] },
    "tuesday":   { "enabled": true,  "start": "09:00", "end": "18:00", "breaks": [] },
    "wednesday": { "enabled": true,  "start": "09:00", "end": "18:00", "breaks": [] },
    "thursday":  { "enabled": true,  "start": "09:00", "end": "18:00", "breaks": [] },
    "friday":    { "enabled": true,  "start": "09:00", "end": "18:00", "breaks": [] },
    "saturday":  { "enabled": false, "start": null,    "end": null,    "breaks": [] },
    "sunday":    { "enabled": false, "start": null,    "end": null,    "breaks": [] }
  }
}
```

**Rules:**
- `timezone`: IANA timezone string (e.g. `"Europe/Moscow"`, `"America/New_York"`). Default is the browser-detected timezone.
- Day keys: `monday` through `sunday` — all seven must be present.
- When `enabled: false`, `start` and `end` are `null`; `breaks` is always an empty array.
- Times are strings in `HH:MM` format (24-hour), stored in the master's selected timezone.
- The booking system is responsible for converting to a client's local time.
- Default state: Monday–Friday enabled at 09:00–18:00; Saturday–Sunday disabled.

---

## TypeScript Mapping

The onboarding store (`src/features/onboarding/model/onboarding.store.ts`) assembles the insert payload via `toMasterProfile()`:

```ts
function toMasterProfile() {
  return {
    first_name:     personal.firstName,
    last_name:      personal.lastName,
    phone:          personal.phone,
    username:       personal.username,
    specializations: [...specializations],
    country:        location.country,
    address:        location.address    || null,
    house_number:   location.houseNumber || null,
    zip_code:       location.zipCode    || null,
    city:           location.city       || null,
    works_at_place: location.worksAtPlace,
    can_travel:     location.canTravel,
    schedule: {
      timezone: schedule.timezone,
      days:     schedule.days,
    },
  }
}
```

This object is passed directly to `supabase.from('master_profile').insert({ user_id: user.id, ...payload })` in Step 5.

---

## Migration History

| File | Date | Description |
|---|---|---|
| `20260425000000_initial_schema.sql` | 2026-04-25 | Create `master_profile` with full identity, address (incl. floor/apartment/entrance_code), and schedule fields |
| `20260426000000_address_redesign.sql` | 2026-04-26 | Drop `floor`, `apartment`, `entrance_code`; add `country` (required) and `house_number`; make `city`, `address`, `zip_code` nullable |

Full SQL is in `supabase/migrations/`.

---

## Cross-references

- [Supabase Integration](../integrations/supabase.md) — how to connect, apply migrations, and manage RLS
- [Auth & Onboarding Flow](../business/auth-and-onboarding.md) — the wizard that populates this table and the business rules around each field
