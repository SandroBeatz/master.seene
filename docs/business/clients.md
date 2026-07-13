---
version: 1.0
date: 2026-07-13
category: business
---

# Clients

> Version 1.0 · 2026-07-13 · [Business](../)

## Overview

A **client** is a person in a master's address book — someone who has had, or may have, an appointment. Clients are the second core domain object after appointments: every booking links to exactly one client via `appointments.client_id`.

The clients area lets a master build and browse their base, mark favourites, attach an emoji avatar, and open a rich preview showing the client's contacts, notes, and full appointment history. It is a production surface (desktop-first; mobile adaptation is a later pass).

This doc covers the domain rules and the UI that expresses them. For the raw table definition, constraints, and RLS see [Data Model → `client`](./data-model.md#client).

## Rules

### Identity and uniqueness

- A client belongs to one master (`user_id`). All reads/writes are scoped by `user_id` and enforced by RLS.
- `phone` is **required** and **unique per master** (`client_user_phone_unique` on `(user_id, phone)`). Creating/editing a client with a duplicate phone raises Postgres error `23505`, surfaced as a localized "duplicate phone" toast.
- `first_name` is required; `last_name`, `email`, `birthday`, `notes`, `emoji` are optional.

### Avatar (emoji or initials)

Each client renders through a single reusable **`ClientAvatar`** component:

- If `emoji` is set, it is shown on a neutral grey background (`bg-elevated`).
- Otherwise the client's **initials** (first letter of first + last name, uppercased) are shown on a **deterministic pastel colour** derived from a stable seed (the client `id`). The same client always gets the same colour.
- The colour comes from a fixed 8-entry palette (`bg-<hue>-100` + `text-<hue>-950` pairs) so every class is present in source and Tailwind never purges it.

The emoji is chosen through a global, reusable [`EmojiPickerModal`](#emoji-picker) — the avatar is not free-form text.

### Favourites

- `is_favorite` is a plain boolean flag, toggled from the card or the preview.
- Favourites sort **first** — `listClients` orders by `is_favorite DESC, first_name ASC`.
- The list additionally **groups** clients into two sections: **Favorites** and **Others**. The "Others" header only appears when at least one favourite exists; with no favourites the list is a single flat group.
- Toggling is optimistic for the open preview (the preview's client is a snapshot, so its star is synced locally and reverted on error) and revalidated via the colada mutation.

### Source (manual vs online)

`source` records how the client entered the base. `'manual'` is the default (added by the master); any other value is treated as an online origin. The UI renders it as a **manual / online** badge — neutral for manual, primary for online. It appears in the list card and in the preview footer next to the "Added" date.

### Last visit

"Last visit" is **derived, not stored**. It is computed from the client's appointments by the `lastVisitDate` helper (see [Appointments](./appointments.md)):

- Considers only appointments whose status is `completed` or `confirmed` **and** whose end time (`start_at + duration`) is in the past.
- Returns the `start_at` of the most recent such appointment, or `null` if there are none.
- Cancelled, no-show, expired, still-pending, and future appointments are ignored.

The list card fetches all of the master's appointments once and builds a `clientId → lastVisitDate` map; the preview computes it from the client's own appointment list.

### Deletion

A client **cannot be deleted while they have appointments** — `appointments_client_id_fkey` is `RESTRICT`. Deletion is offered only from the edit form and the preview (never inline on the card), through the `client-delete` confirmation dialog.

## Data Model

The canonical `Client` shape (`src/entities/client/model/types.ts`):

```ts
interface Client {
  id: string
  user_id: string
  phone: string
  first_name: string
  last_name: string | null
  email: string | null
  birthday: string | null // ISO date YYYY-MM-DD
  notes: string | null
  emoji: string | null       // avatar emoji, falls back to initials
  is_favorite: boolean       // favourites listed first
  source: string             // 'manual' | online origin
  created_at: string
  updated_at: string
}

// emoji / is_favorite are optional on create (DB defaults apply)
type CreateClientDto = Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'emoji' | 'is_favorite'>
  & { emoji?: string | null; is_favorite?: boolean }
type UpdateClientDto = Partial<CreateClientDto> & { id: string }
```

The `emoji` and `is_favorite` columns were added in migration `supabase/migrations/20260712172252_add_client_emoji_favorite.sql`.

## Usage

### Data layer (entity `client`)

All access goes through the entity's public API (`@entities/client`). Raw calls live in `api/clients.api.ts` (throw on error); colada wrappers in `model/client.queries.ts`:

```ts
import {
  useClientsQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useRemoveClientMutation,
  useToggleFavoriteClientMutation,
} from '@entities/client'

const { data: clients, isPending } = useClientsQuery(userId) // favourites first
const toggleFavorite = useToggleFavoriteClientMutation(userId)
await toggleFavorite.mutateAsync({ id, is_favorite: true })
```

> **Loading UX:** gate skeletons on `isPending` (no data yet), **not** `isLoading` (true on every background refetch). This keeps the existing list on screen during colada revalidation instead of flashing a preloader. See [API & Service Layer](../practices/api-service-layer.md).

### List page

`src/pages/clients/ui/ClientsPage.vue` renders a full-width, single-column stack of **`ClientCard`** components, split into Favorites / Others sections. Each card shows the avatar, name, phone, last-visit date, manual/online badge, and two actions — edit and a favourite star (delete is intentionally absent from the card). Clicking the card body opens the preview slideover.

### Preview

`src/widgets/client-details-panel/ui/ClientDetailsPanel.vue` is shown inside a right-side `USlideover` (`#content` slot). Structure:

- **Header** — avatar + name, last-visit line underneath, close (✕) button.
- **Actions** — Edit, Delete, favourite star (icon-only), and a **WhatsApp** button (opens `https://wa.me/<digits>` for the client's phone in a new tab; hidden when no phone).
- **Contacts** — phone (`tel:`) and email (`mailto:`).
- **Notes** — free text.
- **Appointments** — real history via `useClientAppointmentsQuery`, each row showing service names (resolved through `@entities/service`), date/time, status badge, and price. Empty state when none.
- **Footer** — "Added: <date>" with the manual/online badge beside it.

The panel body scrolls independently (`flex h-full min-h-0 flex-col` → inner `flex-1 min-h-0 overflow-y-auto`).

### Create / edit form

`src/features/client-form/ui/ClientFormDialog.vue` (a `UModal`) handles both modes. It includes an **avatar block**: a live `ClientAvatar` preview plus "Choose emoji" (opens the shared `EmojiPickerModal`) and "Remove" (clears back to initials). Phone uses `vue-tel-input` (international mode) with client-side validation; duplicate phones map error `23505` to a localized message.

### Emoji picker

`src/shared/ui/emoji-picker-modal/ui/EmojiPickerModal.vue` wraps the `vue3-emoji-picker` library in a `UModal`. It is a generic, reusable shared component: `v-model:open` + `@select="(emoji: string) => …"`, theme following the app color mode. Its bundled CSS is imported in-component with a slice-local ambient declaration (`vue3-emoji-picker-css.d.ts`).

## Cross-references

- [Data Model](./data-model.md) — the `client` table, constraints, RLS, and deletion (`RESTRICT`) behaviour
- [Appointments](./appointments.md) — `client_id` link, and the `lastVisitDate` helper that powers "last visit"
- [Services](./services.md) — service names/prices resolved for the preview's appointment history
- [Online Booking](./online-booking.md) — origin of `source = online` clients
- [Overlays](../ui/overlays.md) — slideover/modal patterns used by the preview and forms
- [API & Service Layer](../practices/api-service-layer.md) — entity api/queries conventions and `isPending` vs `isLoading`
- [FSD skill](../skills/fsd.md) — layer placement of the client slices

## File Structure

| Path | Role |
|---|---|
| `src/entities/client/model/types.ts` | `Client`, `CreateClientDto`, `UpdateClientDto` |
| `src/entities/client/api/clients.api.ts` | Supabase calls; `listClients` orders favourites first |
| `src/entities/client/model/client.queries.ts` | Colada queries + mutations incl. `useToggleFavoriteClientMutation` |
| `src/entities/client/ui/ClientAvatar.vue` | Reusable avatar: emoji or deterministic-colour initials |
| `src/entities/client/index.ts` | Public API barrel |
| `src/pages/clients/ui/ClientsPage.vue` | List page: search, Favorites/Others sections, slideover orchestration |
| `src/pages/clients/ui/ClientCard.vue` | Full-width client card |
| `src/widgets/client-details-panel/ui/ClientDetailsPanel.vue` | Preview panel (contacts, notes, appointment history, WhatsApp) |
| `src/features/client-form/ui/ClientFormDialog.vue` | Create/edit modal with emoji avatar picker |
| `src/features/client-delete/ui/ClientDeleteConfirm.vue` | Delete confirmation |
| `src/shared/ui/emoji-picker-modal/ui/EmojiPickerModal.vue` | Global reusable emoji picker |
| `supabase/migrations/20260712172252_add_client_emoji_favorite.sql` | Adds `emoji` + `is_favorite` |
