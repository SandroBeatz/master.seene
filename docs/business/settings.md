---
version: 1.2
date: 2026-07-13
category: business
---

# Application Settings

> Version 1.2 · 2026-07-13 · [Business](../business/)

## Overview

Settings is the area where a master configures everything about their account, public booking presence, schedule, and dashboard preferences. It lives under `/settings` and is split into nine sections grouped into **General** (Profile, Contacts & social, Working hours, Booking, Payment methods, Service categories) and **System** (Notifications, System & region, Account).

All settings data for a master is stored across four Postgres tables:

- **`master_profile`** — identity, public page (`username`), specializations, bio, contact/social channels, studio address, and the weekly working-hours `schedule` (JSONB). Also holds `deactivated_at` for soft-deleted accounts.
- **`master_settings`** — one row per user (upsert on `user_id`) holding booking, notification, and system/region preferences.
- **`payment_type`** — one row per payment method a master accepts.
- **`service_category`** — one row per service category (managed by the Service categories section). See [Services](../business/services.md).

The **Account** section is the odd one out: it does not touch these tables for most of its actions. It drives Supabase Auth directly (change email, change password, sign out) and performs a soft-delete by stamping `master_profile.deactivated_at`.

This doc describes how the settings area is wired and documents every field of every section. For the underlying entity API and value normalizers see [Master Entity](../code/master-entity.md); for the raw schema see [Data Model](../business/data-model.md).

## Architecture

### Shell and routing

The settings routes are children of a single parent route (`src/app/router/index.ts`). `/settings` redirects to `/settings/profile`. The parent renders `_EntryPage.vue`, which provides the left navigation rail (`UNavigationMenu`) and a `<RouterView>` slot for the active section. Each section is a thin page component under `src/pages/settings/ui/` that renders one feature slice:

```
/settings/profile        → SettingsProfilePage       → <ProfileForm>             (features/profile-form)
/settings/contacts       → SettingsContactsPage      → <ContactsForm>            (features/contacts-form)
/settings/working-hours  → SettingsWorkingHoursPage  → <WorkingHoursForm>        (features/working-hours-form)
/settings/booking        → SettingsBookingPage       → <BookingSettingsForm>     (features/booking-settings-form)
/settings/payment-types  → SettingsPaymentTypesPage  → (payment-type entity + payment-type-form)
/settings/service-categories → SettingsServiceCategoriesPage → (service-category entity + service-category-form)
/settings/notifications  → SettingsNotificationsPage → <NotificationSettingsForm>(features/notification-settings-form)
/settings/system-region  → SettingsSystemRegionPage  → <SystemRegionForm>        (features/system-region-form)
/settings/account        → SettingsAccountPage       → <AccountSettingsForm>     (features/account-settings)
```

### Data flow (the common form pattern)

Every section except Payment methods, Service categories, and Account follows the same pattern:

1. **Read** — a `@pinia/colada` query (`useMasterProfileQuery` or `useMasterPreferencesQuery`, keyed by `userId`) loads the cached data. See `src/entities/master/model/master.queries.ts`.
2. **Seed** — a `watch` on the query result seeds a local `state` ref via a `seed()` function, but only when the form isn't already dirty (so a background cache refresh never clobbers in-progress edits).
3. **Track** — `useDirtyForm(state, …)` (from `@shared/lib/forms`) diffs the live `state` against the last-saved snapshot to compute `isDirty`, and guards navigation away from unsaved changes.
4. **Save** — a `<FormSaveBar :dirty :saving @save @discard>` (from `@shared/ui`) appears when dirty. On save the form calls a colada mutation, which invalidates the `masterPreferences` / `masterProfile` query keys so every consumer refreshes.

Two sections deviate from "explicit save":

- **Booking** — the `online_booking_enabled` switch in the card header **saves instantly on toggle** (it persists the flag while reusing the last-saved body values, so it never commits half-edited fields). The body fields below still use the Save bar.
- **Payment methods** — every action (toggle active, add custom, reorder, delete) **persists immediately**; there is no Save bar.
- **Service categories** — create / rename / delete each **persist immediately** via the `service-category` entity mutations; there is no Save bar.

### Persistence map

| Section | Table | Write API (`entities/master/api/master.api.ts`) | Save UX |
|---|---|---|---|
| Profile | `master_profile` | `updateMasterProfile` | Save bar |
| Profile · Avatar | `master_profile.avatar_url` + `avatars` Storage bucket | `uploadMasterAvatar` / `removeMasterAvatar` | Instant (eager, no Save bar) |
| Contacts & social | `master_profile` | `updateMasterContacts` | Save bar |
| Working hours | `master_profile.schedule` | `updateMasterSchedule` | Save bar |
| Booking | `master_settings` (upsert) | `updateMasterBookingSettings` | Instant toggle + Save bar |
| Payment methods | `payment_type` | `payment-type` entity API | Instant |
| Service categories | `service_category` | `service-category` entity API | Instant |
| Notifications | `master_settings` (upsert) | `updateMasterNotificationSettings` | Save bar |
| System & region | `master_settings` (upsert) + `master_profile.schedule` (timezone) | `updateMasterSystemSettings` (+ `updateMasterSchedule`) | Save bar |
| Account | Supabase Auth + `master_profile.deactivated_at` | direct `supabase.auth.*` / `.from('master_profile').update(...)` | Per-action modals |

> **Time zone is special.** Although the time-zone selector lives in **System & region**, the value is the single source of truth in `master_profile.schedule.timezone` (shared with Working hours). System & region therefore saves the time zone via the schedule mutation, *not* via `master_settings`. See `MasterSystemSettingsUpdate` in `types.ts` — `timezone` is deliberately excluded.

### `master_settings` rows are lazy

A master may have **no** `master_settings` row until they first touch a Booking/Notification/System setting. All three write APIs `upsert` on the unique `user_id`, so the first save creates the row. Reads (`getMasterSettings`) return `null` when absent, and `createMasterPreferences` fills in defaults — so the UI always renders sensible values even with no row. RLS policy "Users can manage own settings" (`FOR ALL`, `auth.uid() = user_id`) covers insert/update/select.

## Data Model

### `master_profile` (settings-relevant columns)

| Column | Type | Null | Default | Edited in |
|---|---|---|---|---|
| `first_name`, `last_name` | text | NO | — | Profile |
| `username` | text | NO | — | Profile (unique, lowercased) |
| `specializations` | text[] | NO | — | Profile |
| `bio` | text | YES | — | Profile (≤ 500 chars) |
| `avatar_url` | text | YES | `null` | Profile (avatar; public URL into the `avatars` Storage bucket) |
| `phone` | text | NO | — | Contacts |
| `whatsapp`, `telegram`, `instagram`, `tiktok` | text | YES | — | Contacts |
| `contact_email` | text | YES | — | Contacts |
| `country` | text | NO | — | Contacts |
| `address`, `house_number`, `zip_code`, `city`, `place_id` | text | YES | — | Contacts |
| `works_at_place` | boolean | NO | — | Contacts |
| `can_travel` | boolean | NO | — | Contacts |
| `schedule` | jsonb | NO | — | Working hours (+ timezone from System & region) |
| `deactivated_at` | timestamptz | YES | `null` | Account (soft-delete) |

### `master_settings`

| Column | Type | Default | Edited in |
|---|---|---|---|
| `time_format` | smallint (`12`\|`24`) | `24` | System & region |
| `calendar_first_day` | smallint (`0`–`6`) | `1` (Mon) | System & region |
| `calendar_slot_step_minutes` | smallint (`1`–`120`) | `15` | System & region |
| `default_calendar_view` | text (`dayGridMonth`\|`timeGridWeek`\|`timeGridDay`) | `timeGridWeek` | System & region |
| `language` | text (`en`\|`fr`\|`ru`) | `en` | System & region |
| `theme` | text (`auto`\|`light`\|`dark`) | `auto` | System & region |
| `currency` | text | `USD` | System & region |
| `date_format` | text | `DD.MM.YYYY` | System & region |
| `online_booking_enabled` | boolean | `false` | Booking |
| `booking_default_status` | text (`pending`\|`confirmed`) | `pending` | Booking |
| `booking_buffer_minutes` | smallint (`0`–`240`) | `0` | Booking |
| `booking_min_notice_minutes` | integer (≥ 0) | `0` | Booking |
| `client_reminder_whatsapp_enabled` | boolean | `false` | Notifications |
| `client_reminder_offsets_minutes` | smallint[] (subset of `{1440,120,60}`) | `{1440,120}` | Notifications |
| `alert_new_booking_enabled` | boolean | `true` | Notifications |
| `alert_awaiting_confirmation_enabled` | boolean | `true` | Notifications |
| `alert_cancellation_enabled` | boolean | `true` | Notifications |
| `alert_upcoming_appointment_enabled` | boolean | `false` | Notifications |
| `alert_upcoming_offset_minutes` | integer | `60` | Notifications |

### `payment_type`

| Column | Type | Default | Notes |
|---|---|---|---|
| `name` | text | — | Display name |
| `color` | text | `#4ade80` | Hex from a fixed palette |
| `kind` | text (`cash`\|`card`\|`custom`) | `custom` | System methods (`cash`/`card`) are seeded and cannot be deleted, only toggled |
| `is_default` | boolean | `false` | — |
| `is_active` | boolean | `true` | Toggles availability in appointments |
| `sort_order` | integer | `0` | Drag-to-reorder |

Defaults above mirror `src/entities/master/model/master-preferences.ts` (the `DEFAULT_*` constants and `normalize*` functions), which are the runtime fallbacks when a column or row is missing.

## Usage

### Section by section

#### 1. Profile (`features/profile-form`)

Identity and public booking page. Fields:

- **Avatar** — upload/remove, **persisted to Supabase Storage**. Unlike the rest of the form, the avatar is **eager** (it does *not* flow through the Save bar and never marks the form dirty): on file select the image is validated (PNG/JPEG, ≤ 5 MB), cropped to a centered square and downscaled to ≤ 512 px WebP via `resizeImageToSquare` (`@shared/lib/image`), uploaded to the `avatars` bucket at `<userId>/avatar-<timestamp>.webp`, and its public URL written to `master_profile.avatar_url` (`uploadMasterAvatar`). An optimistic preview shows immediately and rolls back on error; **Remove** clears the column (`removeMasterAvatar`). Both actions then call `sessionStore.refreshProfile()` so the avatar updates everywhere it's shown.
- **First name / Last name** — required (validated only once the form is dirty, so a fresh load isn't a wall of red).
- **Specialization** — multi-select chips from `SPECIALIZATION_CODES` (`features/profile-form/config/specializations.ts`); at least one required. Mirrors the onboarding category set.
- **Bio** — optional textarea, max 500 chars.
- **Username** — required, lowercased, pattern `^[a-z0-9._-]+$`. Availability is checked live (debounced 400 ms) via `isUsernameAvailable`; the current user's own username counts as available. Drives the public page URL `https://<PUBLIC_BOOKING_HOST>/<username>` with Open / Copy-link actions.

Saving (and avatar upload/remove) calls `sessionStore.refreshProfile()` so the name and avatar stay in sync everywhere they're shown — the dashboard sidebar footer (`widgets/dashboard-layout`) and the home greeting (`widgets/home/HomeUserWidget`) both read `sessionStore.profile.avatar_url`, falling back to a user icon / `user_metadata.avatar_url` when it's `null`.

#### 2. Contacts & social (`features/contacts-form`)

- **Phone** — required; validated via `vue-tel-input` (international format).
- **WhatsApp / Telegram / Instagram / TikTok / Contact email** — all optional channels.
- **Country** — required; from `@shared/lib/countries`.
- **Address / house number / ZIP / city / place_id** — optional; populated via Google address autocomplete (`AddressAutocomplete`), which fills `place_id` and the structured parts.
- **`works_at_place`** (default true) / **`can_travel`** (default false) — booleans describing where the master serves clients.

#### 3. Working hours (`features/working-hours-form`)

Edits the weekly `master_profile.schedule` (JSONB). The `useWorkingHours` composable holds a normalized 7-day structure (Monday-first, `DAY_ORDER`). Per day:

- **Enabled** toggle (a disabled day is always valid and stores no hours).
- **Start / End** times.
- **Breaks** — a list of `{start, end}` slots. "Add break" defaults to 13:00–14:00 clamped into the day's hours. "Copy to all" copies one day's hours+breaks onto every other enabled day.

Hard validation rules (`validateScheduleDay`), surfaced as inline errors, block saving until clean:
- working hours: end after start;
- each break: end after start;
- each break: fully inside the day's `[start, end]`;
- breaks must not overlap each other.

The `schedule.timezone` field is **not** edited here — it's set in System & region but shares this same JSON object.

#### 4. Booking (`features/booking-settings-form`)

Controls the public online-booking behavior. See [Online Booking](../business/online-booking.md) for the client-facing flow.

- **`online_booking_enabled`** — master switch in the card header. **Saves instantly** on toggle (kept out of the dirty-tracked state; `useBookingSettings.toOnlineUpdate` reuses last-saved body values).
- **`booking_default_status`** — `pending` (needs the master's confirmation) or `confirmed` (auto-confirmed, lands straight in the calendar). Mirrors `AppointmentStatus`.
- **`booking_buffer_minutes`** — padding after each appointment before the next bookable slot; `0`–`240`.
- **`booking_min_notice_minutes`** — how far in advance a client must book (lead time), in minutes.

#### 5. Payment methods (`features/payment-type-form` + `payment-type` entity)

A reorderable list of methods a master accepts. **All changes persist immediately** (no Save bar). See [Payment Types](../business/payment-types.md).

- System methods (`kind` = `cash` / `card`) are seeded automatically and can only be toggled `is_active`, not deleted.
- Custom methods (`kind` = `custom`) can be created (name + color from a fixed palette), edited, reordered (`sort_order`), and deleted.

#### 5b. Service categories (`features/service-category-form` + `service-category` entity)

A flat list of service categories a master can create, rename, and delete. **All changes persist immediately** (no Save bar). See [Services](../business/services.md).

- Create / rename open `ServiceCategoryFormModal` (Joi: name 1–50 chars).
- Delete shows a confirm dialog that **warns the services will become uncategorised** — the FK `service.category_id` uses `ON DELETE SET NULL`, so services are unassigned, never deleted.
- The same categories power the filter chips on the services page and the category dropdown in the service form (where a category can also be created inline).

#### 6. Notifications (`features/notification-settings-form`)

Two groups, all governed by one Save bar.

**Client reminders** — outbound reminders to the client about their appointment:
- **`client_reminder_whatsapp_enabled`** — send via WhatsApp.
- **`client_reminder_offsets_minutes`** — when to remind, a subset of `{1440 (24h), 120 (2h), 60 (1h)}` (checkbox set). Default `{1440,120}`.

**Master alerts** — in-app heads-up for the master:
- **`alert_new_booking_enabled`** (default on) — a new online booking arrived.
- **`alert_awaiting_confirmation_enabled`** (default on) — a request needs approval.
- **`alert_cancellation_enabled`** (default on) — a client cancelled.
- **`alert_upcoming_appointment_enabled`** (default off) + **`alert_upcoming_offset_minutes`** (default 60) — heads-up N minutes before each appointment.

#### 7. System & region (`features/system-region-form`)

Dashboard-wide formatting and appearance. **Language and theme apply live** as the user edits (via `useLocaleStore` / `useColorMode`); discarding reverts them. Other values apply on save.

- **`language`** — `en` / `fr` / `ru` (interface language; persisted to localStorage too).
- **`theme`** — `auto` / `light` / `dark`.
- **`currency`** — from `@shared/config/currencies`; drives price formatting app-wide. Live preview shown.
- **`time_format`** — 12-hour / 24-hour.
- **`date_format`** — from `@shared/config/date-formats`; live preview shown.
- **`timezone`** — IANA zone (with live GMT offset label). Saved to `master_profile.schedule.timezone`, not `master_settings`.
- **`calendar_first_day`** — Monday (`1`) / Sunday (`0`).
- **`default_calendar_view`** — Day / Week / Month.
- **`calendar_slot_step_minutes`** — calendar time-slot granularity (5–60 in the UI; `1`–`120` allowed by the normalizer).

On save, the global `useMasterPreferencesStore` is refreshed so price/date formatting and the calendar widget update without a reload.

#### 8. Account (`features/account-settings`)

The only section that drives Supabase Auth directly rather than the master tables. It renders a `UCard` with an upgrade banner, a Security group, and a Danger zone. See [Auth Guard](../architecture/auth-guard.md) for how deactivation is enforced.

- **Upgrade banner** — dark card opening a Free/Pro plans modal (comparison only; plan selection/billing is not yet implemented).
- **Change email** — `supabase.auth.updateUser({ email }, { emailRedirectTo })`. Standard Supabase secure-email-change: confirmation links go to both the old and new address; the change applies only after both are confirmed.
- **Change password** — re-authenticates with the current password via `signInWithPassword`, then `supabase.auth.updateUser({ password })`. Validates min-8 and matching confirmation.
- **Sign out** — confirmation dialog (`useConfirm`) → `supabase.auth.signOut()` → redirect to `/login`.
- **Delete account** — two-step confirmation modal (type your `username` to confirm, then a final "are you sure"). On confirm it sets `master_profile.deactivated_at = now()` (soft-delete), signs out, and redirects. Physical deletion happens 30 days later via a scheduled Edge Function (planned). The router guard signs out and blocks any session whose profile has `deactivated_at` set, redirecting to `/login?deactivated=1` where a notice is shown.

### Adding a new setting

To add a field to an existing `master_settings`-backed section:

1. Add the column with a migration (`supabase/migrations/…`, applied via `execute_sql` per `CLAUDE.md`) with a sensible default.
2. Extend `MasterSettings` + the relevant `*Update` interface in `entities/master/model/types.ts`.
3. Add a `DEFAULT_*` constant and a `normalize*` mapper in `master-preferences.ts`, wire it through `toMasterSettings` and `createMasterPreferences`.
4. Add the column to `MASTER_SETTINGS_COLUMNS` and the relevant `update*` upsert in `master.api.ts`.
5. Add the control to the feature form's model composable (`state` + `seed` + `toUpdate`) and its `*.vue`.
6. Add i18n keys to all three locales (`en`/`fr`/`ru`).

## Cross-references

- [Master Entity](../code/master-entity.md) — the `master_profile` / `master_settings` API, value normalizers, colada queries/mutations, and schedule helpers used by every settings form.
- [Data Model](../business/data-model.md) — full database schema for these tables.
- [Online Booking](../business/online-booking.md) — client-facing flow governed by the Booking section.
- [Payment Types](../business/payment-types.md) — domain rules for the Payment methods section.
- [Services](../business/services.md) — the `service-category` entity behind the Service categories section, plus inline category creation from the service form.
- [Auth & Onboarding](../business/auth-and-onboarding.md) — where the initial profile/schedule is captured before settings.
- [Auth Guard](../architecture/auth-guard.md) — route guard that enforces account deactivation.
- [Supabase Integration](../integrations/supabase.md) — auth APIs used by the Account section and RLS policies.

## File Structure

| Path | Description |
|---|---|
| `src/app/router/index.ts` | Settings parent route + children; deactivation guard |
| `src/pages/settings/ui/_EntryPage.vue` | Settings shell: left nav rail + `<RouterView>` |
| `src/pages/settings/ui/Settings*Page.vue` | Thin page per section, each renders one feature slice |
| `src/features/profile-form/` | Profile section (identity, username, specializations, bio, avatar) |
| `src/shared/lib/image/` | `resizeImageToSquare` — client-side square crop + downscale used before avatar upload |
| `src/features/contacts-form/` | Contacts & social + studio address |
| `src/features/working-hours-form/` | Weekly schedule editor (`useWorkingHours`) |
| `src/features/booking-settings-form/` | Online booking config (`useBookingSettings`) |
| `src/features/payment-type-form/` | Create/edit custom payment methods |
| `src/features/service-category-form/` | Create/rename service categories (`ServiceCategoryFormModal`) |
| `src/features/notification-settings-form/` | Client reminders + master alerts (`useNotificationSettings`) |
| `src/features/system-region-form/` | Language, theme, currency, formats, calendar prefs |
| `src/features/account-settings/` | Upgrade, email/password, sign-out, delete account |
| `src/entities/master/model/types.ts` | `MasterProfile`, `MasterSettings`, `MasterPreferences` + `*Update` DTOs |
| `src/entities/master/model/master-preferences.ts` | Defaults + `normalize*` mappers |
| `src/entities/master/model/master-schedule.ts` | Schedule normalization + validation rules |
| `src/entities/master/api/master.api.ts` | All read/write APIs for `master_profile` / `master_settings` |
| `src/entities/master/model/master.queries.ts` | Colada queries/mutations + cache invalidation |
| `src/entities/payment-type/` | Payment method entity (types, API, queries) |
| `src/entities/service-category/` | Service category entity (types, API, CRUD mutations) |
