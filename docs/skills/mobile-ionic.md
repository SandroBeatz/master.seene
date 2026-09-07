---
spec_version: 1.0
date: 2026-09-04
status: ready
skill_slug: mobile-ionic
skill_name: Mobile Ionic App
targets: [claude-code, codex, universal]
---

# Mobile Ionic App — Skill Specification

> Spec v1.0 · 2026-09-04 · status: ready · [Skills index](./README.md)

## 1. Purpose

This skill governs how work is done on the **mobile app**, which is a **separate Ionic build target** living alongside the desktop web app in the same repository. The mobile bundle is compiled with `BUILD_TARGET=mobile`, boots from its own composition root (`src/app-mobile/`), uses `@ionic/vue` + `@ionic/vue-router`, and — critically — **must not pull Nuxt UI into its bundle**. Desktop screens are built on Nuxt UI v4; mobile screens are built on native Ionic components. The two share the layers *below* the UI (entities, shared libs, i18n, Supabase, Pinia/Colada) but never share UI components.

The skill exists because the mobile target has non-obvious structural rules that are easy to violate: the `index.mobile.ts` / `ui-mobile/` split that keeps Nuxt UI out of the bundle, the standalone Ionic router with its tab shell and auth guard, the plugins the mobile root must install itself (formats, phone input), and the "reuse the entity data layer, never duplicate it" rule. A single wrong import (e.g. `import { ClientsPage } from '@pages/clients'` instead of `@pages/clients/index.mobile`) silently drags the entire Nuxt UI + widgets tree into the native bundle.

Its value: every new mobile page and feature lands in the right place, on native Ionic components, reusing the shared data/i18n/format layers, with clean code that matches the existing mobile screens.

## 2. When to trigger

**Should trigger:**
- Any request to add, edit, or restructure a **mobile screen/page**: "добавь мобильную страницу", "add a mobile Ionic screen", "сделай экран X в мобилке", "new tab in the mobile app".
- Any **mobile feature** work: a mobile form, list, modal, sheet, swipe action, mobile navigation/tabs, mobile detail view.
- Editing files under `src/app-mobile/`, any `ui-mobile/` directory, or any `index.mobile.ts` barrel.
- Wiring mobile routing, the tab shell (`TabsPage.vue`), the mobile auth guard, or plugins in `src/app-mobile/main.ts`.
- Questions like "where does this mobile component go?", "how do I add a mobile page?", "why is Nuxt UI in the mobile bundle?", "how do I show a toast/alert on mobile?".
- The user mentions **Ionic**, `@ionic/vue`, `IonPage`/`IonContent`/etc., Capacitor screens, or "мобильная версия / мобильное приложение".

**Should NOT trigger:**
- Desktop/web work: files under a slice's `ui/` folder, imports from a slice's `index.ts` (not `.mobile.ts`), or any Nuxt UI (`U*`) markup — that's the [[nuxt-ui]] skill's domain.
- Pure entity/data-layer or API changes that are not mobile-specific (adding a Colada query, an entity type, a Supabase call). Those follow [[fsd]]; the mobile skill only *consumes* that layer. (If the change is *for* a mobile screen, still reuse — don't fork — the entity layer.)
- The superseded "adaptive single app, no Ionic" plan described in `docs/architecture/mobile-version.md`. That direction was reversed; the code now uses a separate Ionic target. Trust the code, not that doc.

This section feeds the built skill's `description`. It must co-exist with [[fsd]] (placement), [[i18n]] (all visible text), and [[nuxt-ui]] (which it *negates* for mobile: nuxt-ui is desktop-only).

## 3. Inputs

- **User request** describing a mobile page/feature/fix.
- **The `src/app-mobile/` tree** — the composition root (`main.ts`, `AppMobile.vue`, `router/index.ts`, `ui/TabsPage.vue`, `styles/main.css`).
- **Existing mobile pages/features** — `src/pages/*/ui-mobile/*.vue` + `src/pages/*/index.mobile.ts`, `src/features/*/ui-mobile/*.vue` + `src/features/*/index.mobile.ts` — the canonical patterns to copy.
- **The shared layers the mobile bundle reuses:** `@entities/*` (Colada queries/mutations, types — all Nuxt-UI-free), `@shared/lib/*` (i18n, formats, now, auth, appearance, supabase), the locale files in `src/shared/lib/i18n/locales/{en,fr,ru}.ts`.
- **Build config** — `vite.config.ts` (`BUILD_TARGET=mobile` branch: `mobile.html` entry, `dist-mobile` output, `@app-mobile` alias, Tailwind without Nuxt UI).
- **Ionic component reference** — https://ionicframework.com/docs/components (use context7 for current API when unsure).

## 4. Outputs

- New/edited **`.vue` files under `ui-mobile/`** using only native Ionic components.
- Updated **`index.mobile.ts` barrels** exporting each new mobile component.
- Route registrations in **`src/app-mobile/router/index.ts`** (and a tab entry in `ui/TabsPage.vue` when it's a top-level destination).
- Plugin registration in **`src/app-mobile/main.ts`** when a screen needs a global (e.g. `formatsPlugin`, `VueTelInput`).
- i18n keys added to **all three locale files** for any new visible text.
- Green **`bun run type-check`** and **`bun lint`**.

No fixed message template; report which files changed, what was reused vs. added, and the check results.

## 5. Workflow

The logic below is host-neutral. A materializing agent adapts it to its tool calls.

### 5.1 Golden rules (apply to every mobile task)
1. **Native Ionic only in the mobile bundle.** Use `IonPage`, `IonHeader`, `IonToolbar`, `IonContent`, `IonList`, `IonItem`, `IonInput`, `IonModal`, `IonItemSliding`, `IonBadge`, `IonSkeletonText`, etc. Use the **imperative controllers** `toastController` and `alertController` (there is no Nuxt UI `useToast`/`UModal`). Navigate with `useIonRouter()`. Icons come from `ionicons/icons` (NOT Lucide `i-lucide-*`). Maximize use of built-in Ionic components before hand-rolling markup — consult the Ionic docs for the right component.
2. **Never import Nuxt UI or desktop UI into the mobile bundle.** Import mobile pages/features via their `index.mobile.ts` barrel, never their `index.ts`. Never write `U*` components in `ui-mobile/` files.
3. **Reuse the shared layer, never duplicate it.** Data comes from `@entities/*` Colada queries/mutations (same cache the desktop uses). Formatting from `useFormats()`. Text from i18n. Auth from `@shared/lib/auth`. If a screen needs data that has no query yet, add the query in the entity (per [[fsd]]) and consume it — don't fetch inline.
4. **FSD still applies** ([[fsd]]): pages in `pages/`, business-logic slices in `features/`, domain in `entities/`. The `.mobile.ts` / `ui-mobile/` convention is layered *on top of* FSD, not a replacement.
5. **All visible text through i18n** ([[i18n]]): reuse existing keys where possible; add missing keys to `en`, `fr`, and `ru` together.
6. **Clean, tidy code that matches the surrounding mobile screens** — same comment density, same naming, same structure as existing `ui-mobile` files. No dead code, no leftover placeholders, no unused imports (they break lint).

### 5.2 Adding a new mobile page
1. Create `src/pages/<name>/ui-mobile/<Name>MobilePage.vue` with an `IonPage` root: `IonHeader > IonToolbar` (title, back button via `IonBackButton`, actions in `IonButtons slot="end"`), then `IonContent`.
2. Export it from `src/pages/<name>/index.mobile.ts` (create the barrel if absent; keep it separate from `index.ts`). Add a one-line comment explaining the split, matching the existing barrels.
3. Register the route in `src/app-mobile/router/index.ts`, lazy-loading via the mobile barrel: `component: async () => (await import('@pages/<name>/index.mobile')).<Name>MobilePage`. Nest under `/tabs/` if it belongs to a tab's stack (so the tab bar stays visible and the stack is per-tab).
4. If it's a top-level destination, add it to the tab shell `src/app-mobile/ui/TabsPage.vue`.
5. Loading states: `IonSpinner` for whole-screen, `IonSkeletonText` for list/detail placeholders. Empty states: a centered `IonLabel`/text block or `IonNote`.

### 5.3 Adding a new mobile feature (form, sheet, action)
1. Create `src/features/<name>/ui-mobile/<Component>.vue` (native Ionic). Prefer **self-contained overlays**: a component that owns its `IonModal` and exposes `v-model:is-open` + emits (e.g. `saved`) is easy to drop into any page. Accept a `presenting-element` prop for the iOS card presentation (the page passes its `ion-router-outlet`).
2. Export from `src/features/<name>/index.mobile.ts`.
3. Reuse the entity's mutations/queries for persistence; show success/error via `toastController`; confirm destructive actions via `alertController`.
4. Consume from a page by importing the mobile barrel and binding `v-model:is-open`.

### 5.4 Wiring plugins / app root
- The mobile root installs its own plugins in `src/app-mobile/main.ts`: `installCore` (Pinia + persistence, Colada, i18n — shared with desktop), then `IonicVue`, the router, and anything a screen needs. `installCore` deliberately **excludes** the formats plugin and any UI kit.
- If a screen uses `useFormats()` (dates/prices), ensure `formatsPlugin` is installed in `main.ts` wired to `useMasterPreferencesStore` (currency, date/time format), **and** that `AppMobile.vue` loads those preferences on login (`masterPreferencesStore.loadPreferences(userId)` on `userId` change, `reset()` on sign-out). Without the load, formats silently fall back to defaults instead of the account's settings.
- If a screen uses the phone field, `VueTelInput` must be registered in `main.ts` (+ its CSS).

### 5.5 Validate
- Run `bun run type-check` and `bun lint`. Fix all errors (unused imports are lint failures). Prefer linting only the touched files to avoid repo-wide `--fix` churn.
- Sanity-check that no Nuxt UI / desktop `index.ts` import crept into a mobile file.

## 6. Resources

- **Ionic components docs** — https://ionicframework.com/docs/components (authoritative for component props/slots; use context7 `@ionic/vue` when API is uncertain).
- **Reference architecture doc** — `docs/architecture/mobile-version.md` (⚠️ describes the *superseded* non-Ionic plan; use only for historical context, prefer the code).
- **Canonical code patterns** (read these before writing new ones):
  - Root: `src/app-mobile/main.ts`, `src/app-mobile/AppMobile.vue`, `src/app-mobile/router/index.ts`, `src/app-mobile/ui/TabsPage.vue`.
  - Page + barrel: `src/pages/clients/ui-mobile/ClientsMobilePage.vue`, `ClientDetailMobilePage.vue`, `src/pages/clients/index.mobile.ts`.
  - Feature + barrel: `src/features/client-form/ui-mobile/ClientFormMobile.vue`, `src/features/client-form/index.mobile.ts`.
- No bundled scripts needed.

## 7. Examples

**Example A — new page**

Input: "Добавь в мобилку страницу профиля мастера."
Output: `src/pages/profile/ui-mobile/ProfileMobilePage.vue` (Ionic `IonPage`, data from `@entities/master`), `src/pages/profile/index.mobile.ts` exporting it, a route under `/tabs/` in `src/app-mobile/router/index.ts`, i18n keys added to en/fr/ru, `type-check` + `lint` green.

**Example B — mobile feature reusing the data layer**

Input: "Сделай удаление клиента свайпом в мобильном списке."
Output: wrap list items in `IonItemSliding` + `IonItemOptions` (destructive `IonItemOption`), confirm via `alertController`, delete via `useRemoveClientMutation` from `@entities/client`, toast via `toastController`; no new data code, no Nuxt UI. (This is exactly how `ClientsMobilePage.vue` implements it.)

**Example C — should NOT trigger**

Input: "Add a UButton to the desktop settings page." → defer to [[nuxt-ui]]; this is not mobile work.

## 8. Acceptance criteria

- Every new mobile UI file lives under a `ui-mobile/` directory and is exported from an `index.mobile.ts` barrel (never mixed into `index.ts`).
- No mobile-bundle file imports Nuxt UI (`@nuxt/ui`, `U*` components) or a slice's desktop `index.ts`; mobile pages/features are imported via `index.mobile`.
- Screens use native Ionic components and `toastController`/`alertController`/`useIonRouter`; icons come from `ionicons/icons`.
- Data is obtained from `@entities/*` Colada queries/mutations — no inline Supabase calls, no duplicated fetch logic.
- All visible strings resolve through i18n and exist in en, fr, and ru.
- New routes are registered in `src/app-mobile/router/index.ts` (and `TabsPage.vue` for tabs); screens needing `useFormats()` have `formatsPlugin` installed and preferences loaded.
- `bun run type-check` and `bun lint` pass with no new errors.

## 9. Target adaptation

### 9.1 Claude Code
Build `.claude/skills/mobile-ionic/SKILL.md` (project-level). Frontmatter `name: mobile-ionic`; `description` must encode §2 triggers (mobile screen/feature work, `ui-mobile/`, `index.mobile.ts`, `src/app-mobile/`, Ionic, "мобильная версия") and the negative cases (desktop/Nuxt UI). Body = §5 workflow, condensed, with the golden rules up top and the "add a page" / "add a feature" checklists. Reference the canonical files from §6. Cross-link the `fsd`, `i18n`, and `nuxt-ui` skills. No scripts/assets required.

### 9.2 Codex / AGENTS.md
Add a `## Mobile Ionic` section to `AGENTS.md` (or `.codex/` instructions): state the separate-Ionic-target rule, the `ui-mobile/` + `index.mobile.ts` split, "native Ionic only, no Nuxt UI", "reuse the entity/i18n/format layer", the add-page/add-feature steps, and the `type-check`/`lint` gate. Keep it imperative and short; point to the canonical files.

### 9.3 Universal
Any agent, given only this spec, can perform the workflow: create Ionic `.vue` files under `ui-mobile/`, export via `index.mobile.ts`, register routes in `src/app-mobile/router/index.ts`, reuse `@entities/*` data and i18n, install plugins in `src/app-mobile/main.ts` when needed, and validate with `bun run type-check` + `bun lint`. The invariants (no Nuxt UI in the mobile bundle; reuse don't duplicate; all text i18n'd) are the portable core.

## 10. Materialization log

| Tool        | Location                            | Built from spec v | Date |
|-------------|-------------------------------------|-------------------|------|
| claude-code | .claude/skills/mobile-ionic/        | —                 | —    |
| codex       | AGENTS.md#mobile-ionic              | —                 | —    |

## 11. Changelog

- v1.0 — Initial spec: separate Ionic build target, `ui-mobile/` + `index.mobile.ts` split, native-Ionic-only rule, reuse-the-shared-layer rule, add-page/add-feature workflows, plugin wiring, and validation gate.
