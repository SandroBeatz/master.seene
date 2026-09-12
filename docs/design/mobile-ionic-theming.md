---
version: 1.0
date: 2026-09-07
category: design
---

# Mobile Ionic Theming (color grid, tokens, component styling)

> Version 1.0 · 2026-09-07 · [Design](../design/)

## Overview

The mobile app is a **separate Ionic build target** and does **not** use Nuxt UI or the `--ui-*`
token system that the desktop web app uses (see [Themes and Variables](./themes-and-variables.md)).
Mobile screens are built on native `@ionic/vue` components, which are styled through **Ionic's own
CSS custom properties** and its **stepped color grid** — a completely different theming model from
the desktop one.

This doc describes how theming works in the Ionic bundle: which Ionic variables exist (and, crucially,
which ones were **missing** and had to be defined), the project's semantic surface tokens
(`--se-surface-page`, `--se-surface-card`, `--se-separator`), how the global grouped background is
applied, and the correct way to restyle Ionic components without hardcoding colors or piercing the
shadow DOM. The reusable `InsetList` component is the canonical worked example.

The guiding rule: **never hardcode a color in a mobile component.** Derive every color from Ionic's
color grid via the project's semantic tokens, so light/dark and the accent color are handled in one
place and flip automatically.

## Design Decisions

### 1. Ionic 9's color grid — and the missing light theme

This project runs **Ionic 9**. Ionic exposes a "color grid": a base background/text pair plus a
19-step scale blended between them, per palette:

```
--ion-background-color            /* base page background */
--ion-text-color                  /* base text color */
--ion-background-color-step-50    /* bg blended 5% toward text ... */
--ion-background-color-step-950   /* ... up to 95% toward text */
--ion-text-color-step-50          /* text blended 5% toward bg ... */
--ion-text-color-step-950
--ion-item-background             /* default ion-item surface */
--ion-card-background             /* default ion-card surface */
```

> **Renamed in Ionic 9.** The old single `--ion-color-step-*` scale (Ionic ≤ 7) no longer exists.
> It was split into **`--ion-background-color-step-*`** (surfaces/grays) and
> **`--ion-text-color-step-*`** (text grays). Referencing `--ion-color-step-*` silently resolves to
> nothing — this was the original bug behind "colors aren't found."

**The trap in this repo:** `src/app-mobile/main.ts` imports only Ionic's *modular* core CSS plus the
**dark** palette (`@ionic/vue/css/palettes/dark.class.css`). It never imports a base **light** theme.
Ionic ships the grid as generated hex values **per palette**, so with only the dark palette present:

- In **dark** mode (`.ion-palette-dark` on `<html>`), the full grid is defined by `dark.class.css`.
- In **light** mode, `--ion-background-color`, `--ion-item-background`, `--ion-card-background`, and
  every `*-step-*` variable were **undefined**.

The fix (in `src/app-mobile/styles/main.css`) is to define the standard light grid at `:root` —
the same values `ionic start` would generate — so the grid exists in both palettes:

```css
:root {
  --ion-background-color: #ffffff;
  --ion-text-color: #000000;
  --ion-background-color-step-50: #f2f2f2;   /* ... through -950: #0d0d0d */
  --ion-text-color-step-50: #0d0d0d;         /* ... through -950: #f2f2f2 */
  --ion-item-background: #ffffff;
  --ion-card-background: #ffffff;
}
```

Dark is already provided by `dark.class.css` (scoped to `.ion-palette-dark.ios` / `.md`), so no dark
grid values are duplicated.

### 2. Semantic surface tokens

Ionic's grid is primitive (grays by number). On top of it the project defines **three semantic
surface roles** — the vocabulary components actually consume — so no component references a raw step
or hex value:

| Token | Role | Light | Dark |
|---|---|---|---|
| `--se-surface-page` | app background every page sits on | `--ion-background-color-step-50` (soft gray) | `--ion-background-color` (near-black) |
| `--se-surface-card` | elevated surface on the page (cards, inset lists) | `--ion-background-color` (white) | `--ion-background-color-step-100` (lighter) |
| `--se-separator` | hairline between rows | `--ion-background-color-step-150` | `--ion-background-color-step-200` |

```css
:root {
  --se-surface-page: var(--ion-background-color-step-50);
  --se-surface-card: var(--ion-background-color);
  --se-separator: var(--ion-background-color-step-150);
}
.ion-palette-dark {
  --se-surface-page: var(--ion-background-color);
  --se-surface-card: var(--ion-background-color-step-100);
  --se-separator: var(--ion-background-color-step-200);
}
```

**Why the direction flips between palettes** (this is the key insight, mirroring iOS's
`systemGroupedBackground` vs `secondarySystemGroupedBackground`): in light, the page is a gray step
and cards are the white base; in dark, the page is the near-black base and cards are a *lighter* step.
A single variable can't express "always one step lighter than the page" across both, so each palette
sets the pair explicitly.

> **Do not use `--ion-item-background` as the card surface.** In dark iOS it equals `#000` (the same
> as the page background), so cards would be invisible. Always use `--se-surface-card`.

### 3. Global grouped background

The grouped gray backdrop is applied **once, globally**, to every page's content, so any elevated
surface reads as raised app-wide:

```css
/* src/app-mobile/styles/main.css */
ion-content {
  --background: var(--se-surface-page);
}
```

A screen that should *not* group (e.g. a full-bleed feed) overrides `--background` on its own
`ion-content`.

### 4. Styling Ionic components correctly

Ionic components are Web Components with **shadow DOM**. The supported way to restyle them is to set
the **CSS custom properties they expose** from light DOM — never `::part()`/deep hacks unless there
is no variable for what you need.

Two techniques used throughout:

- **Set Ionic's per-component variables**, not raw CSS. `ion-item` exposes `--background`,
  `--min-height`, `--padding-start`, `--inner-padding-end`, `--border-color`, `--border-width`,
  `--inner-border-width`, `--detail-icon-opacity`, etc. Setting these cascades into the shadow root.
- **Reach slotted children with `:deep()`.** In a scoped `<style>`, slotted `<ion-item>`s belong to
  the *parent* component's scope, so a plain `.card ion-item` selector won't match. Use
  `.card :deep(ion-item) { ... }`.

Dark overrides in a scoped component work because `html.ion-palette-dark` is an ancestor and Vue's
scoped attribute lands on the component's own element:

```css
.ion-palette-dark .my-component { --token: ...; }  /* matches: ancestor class + scoped element */
```

### 5. The `ui-mobile/` eslint requirement (styling gotcha)

Any Ionic `.vue` file that uses slot attributes (`slot="start"`, `slot="end"`) **must live under a
`ui-mobile/` directory**, because the eslint override that disables `vue/no-deprecated-slot-attribute`
is scoped to `src/app-mobile/**/*.vue` and `src/**/ui-mobile/**/*.vue` (see `eslint.config.ts`,
override `app/ionic-mobile`). A shared styled component like `InsetList` therefore lives at
`src/shared/ui/inset-list/ui-mobile/InsetList.vue`, exported via a mobile-only barrel
(`index.mobile.ts`) so it never enters the Nuxt UI bundle.

## Configuration

All theming lives in **`src/app-mobile/styles/main.css`**:

- **Light base grid** — the full `--ion-*` / `*-step-*` values at `:root` (dark comes from
  `dark.class.css`, imported in `main.ts`).
- **Semantic tokens** — `--se-surface-page` / `--se-surface-card` / `--se-separator` at `:root` and
  overridden under `.ion-palette-dark`.
- **Global background** — `ion-content { --background: var(--se-surface-page) }`.

Per-component design tokens (radius, item height, icon size/gap, section-header size) are defined
locally in the component that owns them — e.g. `InsetList`'s `--se-list-*` tokens — so each component
is tunable in one place while still sourcing *color* from the global tokens.

The theme is applied before mount: `useAppearanceStore().init()` in `main.ts` toggles
`.ion-palette-dark` and sets `--ion-color-primary*` for the chosen accent, so the first painted frame
already matches the user's saved theme.

## Usage

### Consuming the surface tokens

```css
/* any mobile scoped style */
.thing {
  background: var(--se-surface-card);   /* elevated */
  border-bottom: 1px solid var(--se-separator);
  color: var(--ion-color-medium);       /* muted text — always defined by Ionic core */
}
```

Never write `background: #fff` or `background: var(--ion-color-step-50)` — the first ignores dark
mode, the second doesn't exist in Ionic 9.

### The `InsetList` component (canonical example)

`InsetList` (`src/shared/ui/inset-list/ui-mobile/InsetList.vue`) is the reusable iOS "inset grouped"
list. It renders the section header **outside** the rounded card (small, muted — impossible with
native `ion-list[inset]`, whose `ion-list-header` sits *inside* the card), wraps native `<ion-item>`s
in the default slot, and self-contains all card/surface/separator/icon styling sourced from the
global tokens.

```vue
<script setup lang="ts">
import { InsetList } from '@shared/ui/inset-list/index.mobile'
import { personOutline } from 'ionicons/icons'
</script>

<template>
  <ion-content fullscreen class="se-settings-content">
    <inset-list v-for="group in groups" :key="group.key" :header="group.label">
      <ion-item :button="true" :detail="true" router-link="/tabs/settings/profile">
        <ion-icon slot="start" :icon="personOutline" aria-hidden="true" />
        <ion-label>{{ $t('settings.nav.profile') }}</ion-label>
      </ion-item>
    </inset-list>
  </ion-content>
</template>

<style scoped>
/* Grouped background is global; the page only adds vertical rhythm. */
.se-settings-content {
  --padding-top: 24px;
  --padding-bottom: 24px;
}
</style>
```

`InsetList`'s tunable tokens (all local, color sourced from global tokens):

| Token | Default | Controls |
|---|---|---|
| `--se-list-radius` | `12px` | card corner radius |
| `--se-item-min-height` | `48px` | row height |
| `--se-list-inset-x` | `16px` | horizontal inset of the group |
| `--se-group-gap` | `22px` | gap between groups |
| `--se-list-icon-size` | `20px` | leading icon size |
| `--se-list-icon-gap` | `12px` | gap between icon and label |
| `--se-list-header-size` | `13px` | section-header font size |
| `--se-list-surface` | `var(--se-surface-card)` | card background |
| `--se-list-separator` | `var(--se-separator)` | row hairline |
| `--se-list-header-color` | `var(--ion-color-medium)` | section-header color |

The component styles rows via `:deep()` on the slotted items, drops the last row's separator so the
card reads as one card, and sizes/spaces leading icons:

```css
.se-inset-list__card :deep(ion-item) {
  --background: transparent;                 /* card provides the surface */
  --min-height: var(--se-item-min-height);
  --border-color: var(--se-list-separator);
}
.se-inset-list__card :deep(ion-item:last-of-type) {
  --border-width: 0;
  --inner-border-width: 0;
}
.se-inset-list__card :deep(ion-item ion-icon[slot='start']) {
  margin-inline: 0 var(--se-list-icon-gap);
  font-size: var(--se-list-icon-size);
}
```

## Cross-references

- [Themes and Variables](./themes-and-variables.md) — the *desktop* Nuxt UI `--ui-*` token system; contrast with this doc (mobile does not use it)
- [Mobile Ionic App](../skills/mobile-ionic.md) — skill spec for building mobile screens/features (structure, `ui-mobile/`, `index.mobile.ts`, native-Ionic-only)
- [Mobile Ionic Theming](../skills/mobile-ionic-theming.md) — skill spec that operationalizes the rules in this doc
- [Mobile Version Architecture](../architecture/mobile-version.md) — mobile build target overview (note: partly superseded; trust the code)

## File Structure

```
src/app-mobile/
├── main.ts                       # imports Ionic core CSS + dark.class.css + styles/main.css;
│                                 # useAppearanceStore().init() applies theme before mount
└── styles/main.css               # light base grid (:root), semantic --se-surface-* tokens
                                   # (+ .ion-palette-dark overrides), global ion-content background

src/shared/ui/inset-list/
├── ui-mobile/InsetList.vue        # reusable inset-grouped list; header outside card;
│                                  # styles slotted ion-items via :deep(); local --se-list-* tokens
└── index.mobile.ts                # mobile-only barrel (keeps it out of the Nuxt UI bundle)

src/shared/lib/appearance/          # appearance store: toggles .ion-palette-dark, sets accent
eslint.config.ts                    # override 'app/ionic-mobile' — slot attrs allowed under ui-mobile/
```
