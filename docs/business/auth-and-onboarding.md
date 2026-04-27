---
version: 1.3
date: 2026-04-27
category: business
---

# Auth & Onboarding Flow

> Version 1.3 · 2026-04-27 · [Business](../)

## Overview

Every user of Seene is a beauty/wellness master. The auth and onboarding flow is the critical path that takes a new user from first visit to a fully configured master profile ready to work with the dashboard.

The flow has two mandatory phases:

1. **Authentication** — register or log in via Supabase Auth.
2. **Onboarding** — a gated, 5-step wizard that must be completed before accessing the dashboard. The router guard enforces this: a master who has not completed onboarding cannot reach `/home` or any dashboard route.

All data collected during onboarding is persisted to the `master_profile` table in Supabase. Display preferences (time format) are saved to the separate `master_settings` table.

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
| Email confirmation | Disabled now. Will be enabled in Supabase project settings; requires adding a confirmation-pending state and a `/verify-email` page. See [Email Confirmation Implementation Plan](#email-confirmation-implementation-plan) below. |
| Google OAuth | `supabase.auth.signInWithOAuth({ provider: 'google' })` — requires Google Cloud credentials configured in Supabase. |
| Apple OAuth | `supabase.auth.signInWithOAuth({ provider: 'apple' })` — requires Apple Developer setup. |

---

### Email Confirmation Implementation Plan

> **Current state:** email confirmation is **disabled** in Supabase Auth settings for this project. This section documents the known breakage and the concrete implementation plan for when it is re-enabled.

#### The problem

When Supabase Auth's "Confirm email" setting is enabled, `supabase.auth.signUp()` does **not** create a session. The user receives a confirmation email instead. The current `RegisterForm.vue` (`:110`) calls `router.push('/onboarding')` immediately after `signUp()` resolves, regardless of session state.

The `router.beforeEach` guard in `src/app/router/index.ts` then runs:

```
signUp() → no session created
    ↓
router.push('/onboarding')
    ↓
beforeEach: getSession() → null
    ↓
!session && !isAuthRoute && !isOnboarding → return '/login'   ← user lands here
```

The redirect to `/login` is silent — no explanation is shown. The user is lost.

#### Implementation checklist

When enabling email confirmation, make **all** of the following changes together:

**1. Add a `/verify-email` page**

Create `src/pages/verify-email/` with a simple info screen:

> "We've sent a confirmation email to **{email}**. Please click the link in the email to activate your account."

Add the route to `src/app/router/index.ts` and mark it as a public route (no session required):

```ts
const authRoutes = ['/login', '/register', '/verify-email']
```

**2. Update `RegisterForm.vue` — redirect to `/verify-email` instead**

Replace the immediate redirect with a conditional:

```ts
async function onSubmit(event: FormSubmitEvent<RegisterFormData>) {
  const { data, error } = await supabase.auth.signUp({
    email: event.data.email,
    password: event.data.password,
  })
  if (error) {
    toast.add({ title: t('auth.register.errorTitle'), description: error.message, color: 'error' })
    return
  }

  // With email confirmation enabled, signUp returns no session.
  // A session means the user is already confirmed (e.g. confirmation disabled).
  if (data.session) {
    router.push('/onboarding')
  } else {
    // Store email in router state so the verify-email page can display it.
    router.push({ path: '/verify-email', state: { email: event.data.email } })
  }
}
```

**3. Handle the confirmation callback**

Supabase sends the user a link that redirects to your app's **Site URL** with a token in the URL hash (e.g. `/#access_token=...&type=signup`). The Supabase JS client handles this automatically if you listen to `onAuthStateChange` — the `SIGNED_IN` event fires after the token is exchanged.

Wire this up once, globally, in `src/app/main.ts` or a dedicated `src/app/auth/supabase-listener.ts`:

```ts
import { supabase } from '@shared/lib/supabase'
import router from '@app/router'

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    // User confirmed their email and is now logged in.
    // Check onboarding state and redirect appropriately.
    router.push('/onboarding')
  }
})
```

> **Note:** The `SIGNED_IN` event also fires on normal `signInWithPassword` logins. Guard against double-navigation if both paths are active simultaneously — e.g. check that the current route is `/verify-email` before redirecting, or use a flag.

**4. Configure the confirmation redirect URL in Supabase**

In the Supabase dashboard → Auth → URL Configuration:
- **Site URL**: your production domain (e.g. `https://seene.app`)
- **Additional Redirect URLs**: add `http://localhost:5173` for local dev

The confirmation email link will use the Site URL. The Supabase JS client picks up the token from the URL hash on load.

**5. Add `/verify-email` to i18n**

Add keys to `src/shared/lib/i18n/locales/{en,ru,fr}.ts` for the verification screen copy (title, body text, resend-link label).

#### Sequence diagram (with email confirmation enabled)

```
User fills /register form
        │
        ▼
supabase.auth.signUp()
        │
        ├── error → toast, stay on /register
        │
        └── success, NO session (email not confirmed)
                │
                ▼
        router.push('/verify-email')
                │
                │  User opens email, clicks confirmation link
                │
                ▼
        Browser loads app URL with #access_token in hash
                │
                ▼
        Supabase JS exchanges token → fires SIGNED_IN event
                │
                ▼
        onAuthStateChange listener → router.push('/onboarding')
                │
                ▼
        Onboarding wizard (normal flow)
```

### Router guard

Defined in `src/app/router/index.ts` via `router.beforeEach`. The guard reads session and profile state from `useSessionStore` (a Pinia store backed by `onAuthStateChange`) — no Supabase calls are made on each navigation after the first.

Rules:
- Unauthenticated → only `/login` and `/register` are accessible; everything else redirects to `/login`.
- Authenticated without a `master_profile` → redirected to `/onboarding/step1`; cannot access dashboard routes.
- Authenticated with profile → redirected away from auth routes to `/home`.

See [Auth Guard & Session Store](../architecture/auth-guard.md) for implementation details, the session store design, and the Supabase auth lock constraint.

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
| Country | Required. Selected from a searchable list of ~100 countries (ISO 3166-1 alpha-2 codes). Auto-detected from the browser locale on load. Changing the country also auto-updates the time format preference (12h/24h). |
| Street address | Optional. Backed by the `AddressAutocomplete` component which queries Google Places API. Selecting a suggestion auto-fills house number, city, ZIP code, and captures the `place_id`. |
| House number | Optional. Auto-filled from the Places suggestion or entered manually. |
| ZIP code | Optional. Auto-filled from the Places suggestion or entered manually. |
| City | Optional. Auto-filled from the Places suggestion or entered manually. |
| Works at my place | Toggle (boolean). |
| Can travel to client | Toggle (boolean). Independent — both can be on simultaneously. |

The `AddressAutocomplete` component (`src/shared/ui/address-autocomplete/`) is restricted to the selected country via `componentRestrictions`. When the user picks a suggestion, the `place-changed` event fires with the full `IGoogleAutocompleteItem` payload, from which address components are extracted and written to the form fields.

### Step 4 — Schedule & Timezone

The master's weekly availability. This becomes the source of truth for booking slot generation.

**Week schedule:** Each day of the week (Monday–Sunday) has:
- An on/off toggle. Disabled days are not available for booking.
- Start time and end time (when the day is on).
- Zero or more **breaks**: each break has a start and end time. Multiple breaks per day are allowed.

**Timezone:** Defaults to the user's browser-detected timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`). The user can override it with a searchable dropdown. All times are stored in the selected timezone; the client-facing booking UI converts to the client's local time.

**Time format:** A 12HR / 24HR toggle lets the master choose how times are displayed across the UI. The default is auto-derived from the country selected in Step 3 (US, CA, AU, IN, and ~10 others default to 12h; all other countries default to 24h). The user can override this at any time. The selected format is saved to `master_settings.time_format` at Step 5. All time display in the UI goes through the `$f.time()` helper which reads the current format from the store — times are always stored in 24h `HH:MM` format in the database regardless of display preference.

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
1. Final client-side validation: specializations not empty, personal fields all filled, location fields valid (city, address, zip all present if provided), no enabled schedule day missing times.
2. A single `INSERT` into `master_profile` with all fields including `place_id`.
3. On success → `UPSERT` into `master_settings` with `time_format`. Failure here is non-fatal (logged to console; does not block redirect).
4. Redirect to `/home`.
5. On `master_profile` insert error → toast with error details; the user stays on Step 5.

---

## Data Model

See [Data Model](./data-model.md) for the full schema, constraints, RLS policies, and migration history. Summary of onboarding-relevant columns:

### `master_profile` — onboarding columns

| Column | Step | Notes |
|---|---|---|
| `specializations` | 1 | `text[]` array of category keys |
| `first_name`, `last_name`, `phone`, `username` | 2 | identity fields |
| `country` | 3 | ISO 3166-1 alpha-2 code, required |
| `address`, `house_number`, `zip_code`, `city` | 3 | optional; auto-filled from Places autocomplete |
| `place_id` | 3 | nullable; Google Places ID from autocomplete selection |
| `works_at_place`, `can_travel` | 3 | booleans |
| `schedule` | 4 | `jsonb` with `timezone` + weekly day objects |

### `master_settings` — saved at Step 5

| Column | Notes |
|---|---|
| `user_id` | FK → `auth.users.id`, unique |
| `time_format` | `smallint`: `12` or `24` |

---

## Current Implementation Status

| Component | Status | Location |
|---|---|---|
| Email registration | ✅ Done | `src/features/auth-register/ui/RegisterForm.vue` |
| Email login | ✅ Done | `src/features/auth-login/ui/LoginForm.vue` |
| Supabase client | ✅ Done | `src/shared/lib/supabase/client.ts` |
| Router guard (auth + onboarding gate) | ✅ Done | `src/app/router/index.ts` |
| Session store (cached auth + profile state) | ✅ Done | `src/entities/session/model/session.store.ts` |
| Onboarding layout & route | ✅ Done | `src/widgets/onboarding-layout/` |
| Onboarding Step 1 — Specializations | ✅ Done | `src/pages/onboarding/ui/OnboardingStep1Page.vue` |
| Onboarding Step 2 — Personal info | ✅ Done | `src/pages/onboarding/ui/OnboardingStep2Page.vue` |
| Onboarding Step 3 — Address & location | ✅ Done | `src/pages/onboarding/ui/OnboardingStep3Page.vue` |
| Onboarding Step 4 — Schedule & time format | ✅ Done | `src/pages/onboarding/ui/OnboardingStep4Page.vue` |
| Onboarding Step 5 — Review & create | ✅ Done | `src/pages/onboarding/ui/OnboardingStep5Page.vue` |
| Address autocomplete component | ✅ Done | `src/shared/ui/address-autocomplete/` |
| `$f.time()` / `$f.price()` format helper | ✅ Done | `src/shared/lib/formats/index.ts` |
| `master_profile` DB table | ✅ Done | Migrations applied via Supabase MCP |
| `master_settings` DB table | ✅ Done | Migration `20260426140000_master_settings.sql` |
| Google / Apple OAuth | ❌ Not built | UI present, logic not wired |
| Email verification | ❌ Not built | Disabled in Supabase settings — see [implementation plan](#email-confirmation-implementation-plan) |

---

## Cross-references

- [Data Model](./data-model.md) — full schema for `master_profile` and `master_settings`, column definitions, constraints, RLS, and migration history
- [Supabase Integration](../integrations/supabase.md) — how the Supabase client is set up, how to apply schema changes, RLS details
