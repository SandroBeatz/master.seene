---
name: mobile-ionic-theming
description: |
  How to write colors and styles for the MOBILE Ionic app (native @ionic/vue, NOT Nuxt UI). Invoke for any mobile Ionic styling: backgrounds, surfaces, cards, list/row separators, section headers, borders, icon sizing/spacing, radii, spacing in ui-mobile/ .vue files or src/app-mobile/. Invoke when choosing/referencing a COLOR in a mobile component, editing src/app-mobile/styles/main.css or the --se-* tokens, building a reusable styled Ionic component, or restyling an Ionic component via its CSS variables / :deep(). Also invoke on symptoms: "colors aren't found/applying", --ion-color-step-* used, cards not standing out, dark mode wrong, hardcoded #fff/#f2f2f7 in a mobile file.

  Do NOT invoke for desktop Nuxt UI --ui-* theming (see nuxt-ui) or for mobile structure/wiring/routing/data (see mobile-ionic — this skill is the styling layer on top of it).

  Trigger phrases: mobile background/surface/card color, separator, section header color, hardcoded color in mobile, --se-surface-page, --se-surface-card, --se-separator, --ion-background-color-step, --ion-color-step not working, card invisible in dark, style ion-item, :deep ion component, app-mobile/styles/main.css
---

# Mobile Ionic Theming — Seene Project

The mobile app uses **native Ionic** styled through **Ionic's CSS custom properties** and its
**stepped color grid** — a different model from the desktop Nuxt UI `--ui-*` tokens. Full reference:
`docs/design/mobile-ionic-theming.md`.

**The one rule: never hardcode a color in a mobile component.** Derive every color from Ionic's grid
via the project's semantic tokens, so light/dark and the accent color flip automatically in one place.

## Golden rules

1. **No hardcoded colors.** Use a semantic token — `--se-surface-page`, `--se-surface-card`,
   `--se-separator` — or an always-defined Ionic color (`--ion-color-medium`, `--ion-color-primary`).
2. **Ionic 9 grid names.** Surfaces/grays: `--ion-background-color-step-50 … -950`. Text grays:
   `--ion-text-color-step-50 … -950`. Plus `--ion-background-color`, `--ion-text-color`,
   `--ion-item-background`, `--ion-card-background`. **`--ion-color-step-*` does NOT exist** in Ionic 9
   (it was renamed) — using it silently resolves to nothing. This was a real bug here.
3. **Card surface = `--se-surface-card`, never `--ion-item-background`.** In dark iOS the latter equals
   the page background (`#000`) → cards become invisible.
4. **Style Ionic components via their exposed CSS variables**, set from light DOM: e.g. `ion-item`'s
   `--background`, `--min-height`, `--padding-start`, `--inner-padding-end`, `--border-color`,
   `--border-width`, `--inner-border-width`, `--detail-icon-opacity`. Avoid `::part()`/shadow hacks
   unless no variable exists.
5. **Reach slotted children with `:deep()`** in scoped styles: `.card :deep(ion-item) { … }`. A plain
   descendant selector won't match slotted content from the parent scope.
6. **Dark overrides ride the ancestor class:** `.ion-palette-dark .my-el { --token: … }` (works in
   scoped styles — the scoped attribute lands on `.my-el`, the class is on `<html>`).
7. **Slot attributes require `ui-mobile/`.** Any `.vue` using `slot="start"`/`slot="end"` must live
   under `src/app-mobile/**` or `src/**/ui-mobile/**`, or eslint (`app/ionic-mobile` override) fails.

## Context: the grid + the tokens

This repo imports only Ionic's core CSS + the **dark** palette (`main.ts`), so the **light** base grid
had to be defined at `:root` in `src/app-mobile/styles/main.css` (standard `ionic start` values). On
top of the grid sit three semantic surface roles (the vocabulary components consume):

| Token | Role | Light | Dark |
|---|---|---|---|
| `--se-surface-page` | app background pages sit on | `--ion-background-color-step-50` | `--ion-background-color` |
| `--se-surface-card` | elevated surface (cards, lists) | `--ion-background-color` | `--ion-background-color-step-100` |
| `--se-separator` | hairline between rows | `--ion-background-color-step-150` | `--ion-background-color-step-200` |

The page/card **direction flips** between palettes (iOS `systemGroupedBackground` vs
`secondarySystemGroupedBackground`): light page = gray step, cards = white; dark page = near-black
base, cards = lighter step. A single variable can't express both, so each palette sets the pair.

The grouped background is applied **globally** once: `ion-content { --background: var(--se-surface-page) }`.
A screen that shouldn't group overrides `--background` on its own `ion-content`.

## Pick a color

1. **Surface?** page → `--se-surface-page`; elevated card/list → `--se-surface-card`.
2. **Hairline/border?** → `--se-separator`.
3. **Muted text** (section header, hint)? → `--ion-color-medium`.
4. **Accent?** → `--ion-color-primary` (+ `-shade` / `-tint` / `-rgb`).
5. **A specific gray not covered?** use the grid step directly
   (`--ion-background-color-step-N` / `--ion-text-color-step-N`); if it'll be reused, promote it to a
   new `--se-*` token. Confirm the exact name/value by grepping
   `node_modules/@ionic/vue/css/palettes/dark.class.css`.
6. Keep a fallback: `var(--se-token, <fallback>)`.

## Add / patch a semantic token

- Define it at `:root` in `src/app-mobile/styles/main.css` for **light**, override under
  `.ion-palette-dark` for **dark** — set both explicitly (the direction flips).
- If it depends on a grid step undefined in light, extend the light base grid at `:root`.

## Build a reusable styled Ionic component

1. Place at `src/shared/ui/<name>/ui-mobile/<Name>.vue`; export from `index.mobile.ts` (never the
   Nuxt-UI `index.ts`).
2. Declare **local `--se-*` design tokens** for non-color knobs (radius, height, spacing, icon size)
   on the root class; source **color** from the global `--se-surface-*` / `--se-separator` (with
   fallbacks).
3. Style slotted Ionic elements with `:deep()`; set component CSS variables, not raw properties.
4. Handle first/last-row separators and icon size/gap centrally (see the canonical example).

Canonical example: `src/shared/ui/inset-list/ui-mobile/InsetList.vue` (local `--se-list-*` tokens +
`:deep()` item styling; header rendered *outside* the card).

## Validate

- `bun run type-check` + `bun lint` (unused imports and mislocated slot attrs fail).
- If `main.css` or a shared component changed: `BUILD_TARGET=mobile vite build`, then grep
  `dist-mobile` assets for `@nuxt/ui` (must be clean).
- Verify visually in **both** palettes — cards must stand out from the page in light *and* dark.

## Acceptance checklist

- [ ] No hardcoded color except the light base grid in `main.css` and `var(--token, <fallback>)` fallbacks.
- [ ] No `--ion-color-step-*` (removed in Ionic 9); grays use `--ion-background-color-step-*` / `--ion-text-color-step-*` or a `--se-*` token.
- [ ] Cards use `--se-surface-card` (not `--ion-item-background`); pages `--se-surface-page`; hairlines `--se-separator`.
- [ ] Ionic components restyled via their CSS variables + `:deep()` for slotted children; no needless shadow piercing.
- [ ] `.vue` with `slot=` attrs live under `src/app-mobile/**` or `src/**/ui-mobile/**` and pass eslint.
- [ ] Correct in both palettes; `type-check` + `lint` pass (+ mobile build clean for bundle-affecting changes).
