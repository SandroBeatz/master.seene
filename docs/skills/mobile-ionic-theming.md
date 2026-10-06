---
spec_version: 1.0
date: 2026-09-07
status: built
skill_slug: mobile-ionic-theming
skill_name: Mobile Ionic Theming
targets: [claude-code, codex, universal]
---

# Mobile Ionic Theming — Skill Specification

> Spec v1.0 · 2026-09-07 · status: built · [Skills index](./README.md)

## 1. Purpose

This skill governs **how colors and styles are written for the mobile Ionic app**. The mobile bundle
does not use Nuxt UI or the desktop `--ui-*` tokens; it uses native `@ionic/vue` components styled
through Ionic's CSS custom properties and its stepped color grid. The skill makes every agent style
those components the *correct, theme-safe* way: derive every color from Ionic's color grid via the
project's semantic surface tokens, never hardcode a hex value, and restyle Ionic components through
their exposed CSS variables (and `:deep()` for slotted children) instead of piercing shadow DOM.

It exists because the mobile theming model has sharp, non-obvious edges that already caused bugs:
Ionic 9 **renamed** the stepped-color palette (`--ion-color-step-*` no longer exists — it's now
`--ion-background-color-step-*` / `--ion-text-color-step-*`); this repo imports only Ionic's core CSS
plus the **dark** palette, so the **light** base grid is undefined and must be provided; and the
grouped-surface direction (page vs. card) **flips between light and dark**, so a single variable can't
express it. Getting any of these wrong yields invisible cards, colors that don't flip with the theme,
or `var()` references that silently resolve to nothing.

Its value: mobile UI that looks right in both palettes and with any accent color, with all color logic
centralized in two places (the global tokens and the component's local tokens) instead of scattered
hardcoded values.

## 2. When to trigger

**Should trigger:**
- Any styling of **mobile Ionic** UI: backgrounds, surfaces, cards, list/row separators, section
  headers, borders, icon sizing/spacing, radii, spacing in `ui-mobile/` `.vue` files or
  `src/app-mobile/`.
- Choosing or referencing a **color** in a mobile component ("сделай фон как…", "why is the card
  invisible in dark mode?", "add a separator", "this gray is hardcoded").
- Editing `src/app-mobile/styles/main.css`, the semantic tokens (`--se-surface-page`,
  `--se-surface-card`, `--se-separator`), or a component's local `--se-*` design tokens.
- Building a **reusable styled Ionic component** (like `InsetList`) or restyling an existing Ionic
  component via its CSS variables / `:deep()`.
- Symptoms: "colors aren't found / not applying", `--ion-color-step-*` used, cards not standing out
  from the page, dark mode looks wrong, hardcoded `#fff`/`#f2f2f7` in a mobile file.

**Should NOT trigger:**
- Desktop/web theming — that's the Nuxt UI `--ui-*` system (`docs/design/themes-and-variables.md`),
  a different model. Defer to [[nuxt-ui]].
- Mobile *structure/wiring* (where a page/feature goes, routing, `index.mobile.ts` barrels, data
  reuse, plugins) — that's [[mobile-ionic]]. This skill is the **styling layer** on top of it; the
  two co-apply on a styled mobile screen.
- Accent-color / theme-mode *behavior* logic (the appearance store toggling `.ion-palette-dark` and
  setting `--ion-color-primary*`) — this skill *consumes* the palette, it doesn't own the store.

This section feeds the built skill's `description`. It must co-exist with [[mobile-ionic]] (mobile
structure) and negate [[nuxt-ui]] (desktop-only).

## 3. Inputs

- **User request** describing a mobile visual change or a color/surface question.
- **`src/app-mobile/styles/main.css`** — the light base grid, the `--se-surface-*` / `--se-separator`
  tokens (+ `.ion-palette-dark` overrides), and the global `ion-content` background.
- **`src/app-mobile/main.ts`** — which Ionic CSS is imported (core + `dark.class.css` only) and where
  the theme is applied (`useAppearanceStore().init()`).
- **The canonical component** — `src/shared/ui/inset-list/ui-mobile/InsetList.vue` + its
  `index.mobile.ts`: the reference for local `--se-*` tokens and `:deep()` styling.
- **Ionic's shipped palette** — `node_modules/@ionic/vue/css/palettes/dark.class.css` (authoritative
  for the exact grid variable **names** and per-mode values; grep it when unsure).
- **`eslint.config.ts`** — override `app/ionic-mobile` (slot attributes allowed only under
  `ui-mobile/`).
- **Design doc** — `docs/design/mobile-ionic-theming.md` (the full reference this skill enforces).

## 4. Outputs

- Edited mobile `.vue` scoped styles / `src/app-mobile/styles/main.css` that source **all colors**
  from Ionic grid variables via the `--se-*` tokens — zero hardcoded hex (except the standard light
  base grid definition and documented fallbacks inside `var(..., fallback)`).
- New reusable styled Ionic components placed under a `ui-mobile/` directory with a `index.mobile.ts`
  barrel, using local `--se-*` design tokens for radius/height/spacing and global tokens for color.
- Green **`bun run type-check`** and **`bun lint`** (slot attributes only pass under `ui-mobile/`),
  and, when a bundle-affecting file changes, a clean **`BUILD_TARGET=mobile vite build`**.

No fixed message template; report which tokens/files changed and the check results.

## 5. Workflow

Host-neutral; a materializing agent adapts it to its tool calls.

### 5.1 Golden rules
1. **Never hardcode a color** in a mobile component. Every color comes from an Ionic grid variable,
   preferably through a semantic token: `--se-surface-page`, `--se-surface-card`, `--se-separator`,
   or an always-defined Ionic color like `--ion-color-medium` / `--ion-color-primary`.
2. **Use Ionic 9 variable names.** The grid is `--ion-background-color-step-*` (surfaces/grays) and
   `--ion-text-color-step-*` (text grays), plus `--ion-background-color` / `--ion-text-color` /
   `--ion-item-background` / `--ion-card-background`. **`--ion-color-step-*` does not exist** — do not
   use it.
3. **Card surface = `--se-surface-card`, never `--ion-item-background`.** In dark iOS the latter equals
   the page background, so cards would vanish.
4. **Style Ionic components via their exposed CSS variables**, set from light DOM (e.g. `ion-item`'s
   `--background`, `--min-height`, `--border-color`, `--border-width`, `--inner-border-width`,
   `--padding-start`, `--detail-icon-opacity`). Avoid `::part()`/deep shadow hacks unless no variable
   exists.
5. **Reach slotted children with `:deep()`** in scoped styles (`.card :deep(ion-item) { … }`) — a
   plain descendant selector won't match slotted content from the parent scope.
6. **Dark overrides** ride on the ancestor class: `.ion-palette-dark .my-el { --token: … }` (works in
   scoped styles because the scoped attribute lands on `.my-el`).
7. **Slot attributes require `ui-mobile/`.** Any `.vue` using `slot="start"`/`slot="end"` must live
   under `src/app-mobile/**` or `src/**/ui-mobile/**` or eslint fails.

### 5.2 Picking/using a color
1. Is it a **surface**? Page background → `--se-surface-page`; an elevated card/list → `--se-surface-card`.
2. Is it a **hairline/border**? → `--se-separator`.
3. Is it **muted text** (section header, hint)? → `--ion-color-medium`.
4. Is it the **accent**? → `--ion-color-primary` (and `-shade`/`-tint`/`-rgb` variants).
5. Need a specific gray not covered by a token? Use the grid step directly
   (`--ion-background-color-step-N` / `--ion-text-color-step-N`) — and consider promoting it to a new
   `--se-*` token if it'll be reused. Confirm the exact name/value by grepping `dark.class.css`.
6. Always keep a sensible fallback in `var(--se-token, <fallback>)` for robustness.

### 5.3 Adding/patching a semantic token
- Define it at `:root` in `src/app-mobile/styles/main.css` for **light**, and override under
  `.ion-palette-dark` for **dark** — remember the page/card direction flips between palettes, so set
  both explicitly rather than assuming "one step lighter" works for both.
- If the value depends on a grid step that isn't defined in **light** (only dark ships by default),
  ensure the light base grid at `:root` covers it; extend the grid if a new step is needed.

### 5.4 Building a reusable styled Ionic component
1. Place it at `src/shared/ui/<name>/ui-mobile/<Name>.vue`; export from `index.mobile.ts` (never the
   Nuxt-UI `index.ts`).
2. Declare **local `--se-*` design tokens** for non-color knobs (radius, height, spacing, icon size)
   at the root class; source **color** tokens from the global `--se-surface-*` / `--se-separator`
   with fallbacks.
3. Style slotted Ionic elements with `:deep()`; set component CSS variables, not raw properties.
4. Handle first/last-row separators and icon size/gap centrally in the component (see `InsetList`).

### 5.5 Validate
- `bun run type-check` and `bun lint` (fix all — unused imports and mislocated slot attrs fail).
- If `main.css` or a shared component changed, run `BUILD_TARGET=mobile vite build` and confirm no
  Nuxt UI leaked into `dist-mobile` (grep the built assets for `@nuxt/ui`).
- Verify visually in **both** palettes: cards must stand out from the page in light *and* dark.

## 6. Resources

- **Design reference** — `docs/design/mobile-ionic-theming.md` (the authoritative rules this skill
  enforces; keep them in sync).
- **Ionic theming docs** — https://ionicframework.com/docs/theming/themes (color grid, stepped
  colors) and https://ionicframework.com/docs/theming/css-variables (per-component variables). Use
  context7 for `@ionic/vue` when a component's variable set is uncertain.
- **Shipped palette** — `node_modules/@ionic/vue/css/palettes/dark.class.css` — grep for exact grid
  variable names and per-mode (`.ios` / `.md`) values.
- **Canonical code** — `src/shared/ui/inset-list/ui-mobile/InsetList.vue` (local tokens + `:deep()`),
  `src/app-mobile/styles/main.css` (grid + semantic tokens + global background).
- No bundled scripts needed.

## 7. Examples

**Example A — a hardcoded surface**

Input: "Фон карточки захардкожен `#fff`, поправь по-нормальному."
Output: replace `background: #fff` with `background: var(--se-surface-card, #fff)`; if the element is
an Ionic component, set its `--background` variable instead; verify the card is visible in dark mode.

**Example B — separator that doesn't flip**

Input: "Разделители в списке не видно в тёмной теме."
Output: switch the border color to `var(--se-separator)` (which is overridden under
`.ion-palette-dark` in `main.css`); if styling an `ion-item`, set `--border-color` / drop the last
row via `--border-width: 0` + `--inner-border-width: 0`.

**Example C — `--ion-color-step-*` used**

Input: "`var(--ion-color-step-50)` не резолвится."
Output: it's the removed Ionic ≤7 name; replace with the Ionic 9 grid (`--ion-background-color-step-50`)
or, better, the semantic `--se-surface-page`; ensure the light base grid is defined in `main.css`.

**Example D — should NOT trigger**

Input: "Change the primary color of the desktop UButtons." → defer to [[nuxt-ui]]; desktop `--ui-*`
system, not mobile Ionic theming.

## 8. Acceptance criteria

- No mobile component introduces a hardcoded color except (a) the standard light base grid in
  `src/app-mobile/styles/main.css` and (b) fallbacks inside `var(--token, <fallback>)`.
- No file references `--ion-color-step-*` (removed in Ionic 9); grays use
  `--ion-background-color-step-*` / `--ion-text-color-step-*` or a `--se-*` token.
- Card/elevated surfaces use `--se-surface-card` (never `--ion-item-background`); page backgrounds use
  `--se-surface-page`; hairlines use `--se-separator`.
- Ionic components are restyled via their exposed CSS variables and, for slotted children, `:deep()`;
  no unnecessary `::part()`/shadow piercing.
- Any `.vue` using `slot=` attributes lives under `src/app-mobile/**` or `src/**/ui-mobile/**` and
  passes eslint (`app/ionic-mobile` override).
- Surfaces are correct in **both** palettes (cards stand out from the page in light and dark).
- `bun run type-check` and `bun lint` pass; bundle-affecting changes also pass
  `BUILD_TARGET=mobile vite build` with no Nuxt UI in `dist-mobile`.

## 9. Target adaptation

### 9.1 Claude Code
Build `.claude/skills/mobile-ionic-theming/SKILL.md` (project-level). Frontmatter
`name: mobile-ionic-theming`; `description` must encode §2 triggers (styling mobile Ionic —
colors/surfaces/separators/cards, `ui-mobile/` scoped styles, `--se-*` tokens, `main.css`, "colors
not found", `--ion-color-step-*`) and the negatives (desktop Nuxt UI, mobile structure). Body = §5
(golden rules first, then the pick-a-color and add-a-token checklists). Bundle a short `references/`
copy of the grid names + semantic-token table from §5/design doc. Cross-link [[mobile-ionic]] and
[[nuxt-ui]].

### 9.2 Codex / AGENTS.md
Add a `## Mobile Ionic Theming` section to `AGENTS.md`: Ionic 9 grid names (and the removed
`--ion-color-step-*`), the light-grid-must-be-defined caveat, the three `--se-surface-*` /
`--se-separator` tokens and the light/dark flip, "card = `--se-surface-card`, not
`--ion-item-background`", style via component CSS vars + `:deep()`, the `ui-mobile/` slot-attr rule,
and the `type-check` / `lint` / mobile-build gate. Imperative and short; point to `InsetList` and
`main.css`.

### 9.3 Universal
Any agent, given only this spec, can: source colors from Ionic's grid via `--se-surface-page` /
`--se-surface-card` / `--se-separator` (defining/patching them in `main.css` with per-palette values),
use Ionic 9 grid names, restyle components through their CSS variables and `:deep()`, keep slot-attr
files under `ui-mobile/`, and validate with `type-check` + `lint` (+ mobile build). The invariants
(no hardcoded colors; correct Ionic 9 names; card ≠ item-background; both palettes verified) are the
portable core.

## 10. Materialization log

| Tool        | Location                                   | Built from spec v | Date |
|-------------|--------------------------------------------|-------------------|------|
| claude-code | .claude/skills/mobile-ionic-theming/       | 1.0               | 2026-09-07 |
| codex       | AGENTS.md#mobile-ionic-theming             | —                 | —    |

## 11. Changelog

- v1.0 — Initial spec: Ionic 9 color grid (+ the renamed `--ion-color-step-*`), the missing-light-grid
  fix, the `--se-surface-page` / `--se-surface-card` / `--se-separator` semantic tokens and their
  light/dark flip, global grouped background, styling Ionic via CSS variables + `:deep()`, the
  `ui-mobile/` slot-attr rule, and the validation gate. Canonical example: `InsetList`.
