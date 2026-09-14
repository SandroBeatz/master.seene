---
name: mobile-ionic
description: |
  Mobile Ionic app skill for this repo. The mobile app is a SEPARATE Ionic build target (BUILD_TARGET=mobile, composition root src/app-mobile/, @ionic/vue + @ionic/vue-router) that MUST NOT pull Nuxt UI into its bundle. Invoke this skill for ANY mobile screen/feature work: adding/editing a mobile page or feature, files under src/app-mobile/, any ui-mobile/ directory, any index.mobile.ts barrel, mobile routing/tabs/auth-guard, or mobile toasts/alerts. Also invoke when the user mentions Ionic, @ionic/vue, IonPage/IonContent/etc., Capacitor screens, or "мобильная версия / мобильное приложение".

  Do NOT invoke for desktop/web work (Nuxt UI U* components, a slice's desktop index.ts, files under ui/) — that's the nuxt-ui skill. For pure entity/data-layer changes follow fsd (mobile only consumes that layer). For mobile styling/colors/tokens, also invoke mobile-ionic-theming.

  Trigger phrases: add mobile page, mobile Ionic screen, экран в мобилке, new mobile tab, mobile form/list/modal, swipe action, ui-mobile, index.mobile.ts, src/app-mobile, why is Nuxt UI in the mobile bundle, mobile toast/alert
---

# Mobile Ionic App — Seene Project

The mobile app is a **separate Ionic build target** in the same repo as the desktop web app. It
compiles with `BUILD_TARGET=mobile`, boots from `src/app-mobile/`, uses `@ionic/vue` +
`@ionic/vue-router`, and **must never pull Nuxt UI into its bundle**. Desktop = Nuxt UI v4; mobile =
native Ionic. They share everything *below* the UI (entities, shared libs, i18n, Supabase,
Pinia/Colada) and share **no** UI components.

> One wrong import (e.g. `from '@pages/clients'` instead of `@pages/clients/index.mobile`) silently
> drags the whole Nuxt UI + widgets tree into the native bundle. This is the #1 mistake — guard it.

## Golden rules (every mobile task)

1. **Native Ionic only in the mobile bundle.** `IonPage`, `IonHeader`, `IonToolbar`, `IonContent`,
   `IonList`, `IonItem`, `IonInput`, `IonModal`, `IonItemSliding`, `IonSkeletonText`, etc. Overlays
   via the **imperative controllers** `toastController` / `alertController` (no Nuxt UI
   `useToast`/`UModal`). Navigate with `useIonRouter()`. Icons from `ionicons/icons` (NOT Lucide
   `i-lucide-*`). Prefer built-in Ionic components before hand-rolling markup.
2. **Never import Nuxt UI or desktop UI into the mobile bundle.** Import mobile pages/features via
   their `index.mobile.ts` barrel, never their `index.ts`. No `U*` components in `ui-mobile/` files.
3. **Reuse the shared layer, never duplicate it.** Data from `@entities/*` Colada queries/mutations
   (same cache as desktop). Formatting from `useFormats()`. Text from i18n. Auth from
   `@shared/lib/auth`. Need data with no query yet? Add the query in the entity (per **fsd**) and
   consume it — don't fetch inline.
4. **FSD still applies** (see the `fsd` skill): pages in `pages/`, logic in `features/`, domain in
   `entities/`. The `.mobile.ts` / `ui-mobile/` convention layers *on top of* FSD.
5. **All visible text through i18n** (see the `i18n` skill): reuse keys; add missing keys to `en`,
   `fr`, and `ru` together.
6. **Clean code matching the surrounding mobile screens** — same comment density, naming, structure.
   No dead code, no unused imports (they fail lint).
7. **Styling colors/surfaces?** Follow the `mobile-ionic-theming` skill (Ionic color grid + `--se-*`
   tokens, no hardcoded colors).

## Add a new mobile page

1. Create `src/pages/<name>/ui-mobile/<Name>MobilePage.vue` with an `IonPage` root:
   `IonHeader > IonToolbar` (title; back button via `IonBackButton`; actions in
   `IonButtons slot="end"`), then `IonContent`.
2. Export it from `src/pages/<name>/index.mobile.ts` (create the barrel if absent; keep separate from
   `index.ts`; add the one-line "why the split" comment like the existing barrels).
3. Register the route in `src/app-mobile/router/index.ts`, lazy-loaded via the mobile barrel:
   `component: async () => (await import('@pages/<name>/index.mobile')).<Name>MobilePage`. Nest under
   `/tabs/` if it belongs in a tab's stack (tab bar stays visible, per-tab stack).
4. If it's a top-level destination, add it to the tab shell `src/app-mobile/ui/TabsPage.vue`.
5. Loading: `IonSpinner` (whole screen) / `IonSkeletonText` (list/detail). Empty: centered
   `IonLabel`/`IonNote`.

## Add a new mobile feature (form, sheet, action)

1. Create `src/features/<name>/ui-mobile/<Component>.vue` (native Ionic). Prefer **self-contained
   overlays**: own the `IonModal`, expose `v-model:is-open` + emits (e.g. `saved`). Accept a
   `presenting-element` prop for the iOS card presentation (page passes its `ion-router-outlet`).
2. Export from `src/features/<name>/index.mobile.ts`.
3. Persist via the entity's mutations/queries; success/error via `toastController`; confirm
   destructive actions via `alertController`.
4. Consume from a page by importing the mobile barrel and binding `v-model:is-open`.

## App root / plugins (`src/app-mobile/main.ts`)

- The mobile root installs its own plugins: `installCore` (Pinia + persistence, Colada, i18n —
  shared with desktop), then `IonicVue`, the router, and anything a screen needs. `installCore`
  **excludes** the formats plugin and any UI kit.
- Screen uses `useFormats()` (dates/prices)? Ensure `formatsPlugin` is installed in `main.ts` wired
  to `useMasterPreferencesStore` **and** that `AppMobile.vue` loads preferences on login
  (`masterPreferencesStore.loadPreferences(userId)` on `userId` change, `reset()` on sign-out). Skip
  the load and formats silently fall back to defaults.
- Screen uses the phone field? `VueTelInput` must be registered in `main.ts` (+ its CSS).

## Validate

- Run `bun run type-check` and `bun lint`. Fix all errors (unused imports fail). Prefer linting only
  the touched files to avoid repo-wide `--fix` churn.
- Sanity-check no Nuxt UI / desktop `index.ts` import crept into a mobile file. For bundle-affecting
  changes, `BUILD_TARGET=mobile vite build` and grep `dist-mobile` for `@nuxt/ui`.

## Canonical files (read before writing new ones)

- Root: `src/app-mobile/main.ts`, `AppMobile.vue`, `router/index.ts`, `ui/TabsPage.vue`.
- Page + barrel: `src/pages/clients/ui-mobile/ClientsMobilePage.vue`, `ClientDetailMobilePage.vue`,
  `src/pages/clients/index.mobile.ts`.
- Feature + barrel: `src/features/client-form/ui-mobile/ClientFormMobile.vue`,
  `src/features/client-form/index.mobile.ts`.
- Ionic components: https://ionicframework.com/docs/components (use context7 for `@ionic/vue` when API
  is uncertain).

> Note: `docs/architecture/mobile-version.md` describes a *superseded* non-Ionic plan. Trust the code.

## Acceptance checklist

- [ ] Every new mobile UI file is under `ui-mobile/` and exported from `index.mobile.ts` (not `index.ts`).
- [ ] No mobile-bundle file imports Nuxt UI (`@nuxt/ui`, `U*`) or a slice's desktop `index.ts`.
- [ ] Native Ionic components + `toastController`/`alertController`/`useIonRouter`; icons from `ionicons/icons`.
- [ ] Data from `@entities/*` Colada queries/mutations — no inline Supabase, no duplicated fetch.
- [ ] All visible strings via i18n and present in en, fr, ru.
- [ ] Routes registered in `src/app-mobile/router/index.ts` (+ `TabsPage.vue` for tabs); `useFormats()` screens have `formatsPlugin` + preferences loaded.
- [ ] `bun run type-check` and `bun lint` pass.
