---
version: 1.3
date: 2026-07-17
category: architecture
---

# Mobile Version

> Version 1.3 · 2026-07-17 · [Architecture](../architecture/)

> **Living document.** This is the single source of truth for everything about the
> Seene mobile version. It is updated continuously as the mobile work progresses —
> decisions, patterns, gotchas, and status all get recorded here. If reality and this
> doc disagree, fix the doc.

## Overview

Seene targets a **mobile app that feels native** (fast start, bottom tab bar, back
headers, page transitions, swipe-back, haptics) while **reusing the existing web UI
stack** — the same Nuxt UI v4 components, the same `--ui-*` CSS variables, the same
FSD architecture. The plan is: make the current single app fully mobile-adaptive and
native-feeling, then wrap that same build in **Capacitor** to ship to iOS and Android.

**Chosen direction (locked 2026-07-16, navigation + sequencing revised 2026-07-17):**

| Decision | Choice | Consequence |
|---|---|---|
| Architecture | **Adaptive single app on current Nuxt UI + Capacitor** | No monorepo split, no Ionic. Same components adapt to viewport. |
| Navigation | **Bottom tab bar (Home, Calendar, (+) actions, Analytics, Settings) + "back" headers** | 4 fixed tabs + a center actions button; desktop keeps the vertical sidebar rail unchanged. See [Navigation structure](#navigation-structure). |
| Platforms | **iOS + Android in parallel** | Both configured and tested together from the start. |
| Native feel | **Deferred, not first** *(reversed 2026-07-17)* | Build the whole mobile version functionally first (shell, sheets, all screens, calendar) with plain, unanimated navigation. Page transitions, swipe-back, and haptics are a dedicated late phase, right before ship polish — not baked in from day one. |

This **supersedes** the earlier Ionic-monorepo design
([`docs/superpowers/specs/2026-07-14-capacitor-ionic-mobile-design.md`](../superpowers/specs/2026-07-14-capacitor-ionic-mobile-design.md)),
which proposed a separate `apps/mobile` rebuilt on Ionic + stable Vue 3 + Router 4.
That approach is **abandoned** because it duplicates the UI instead of reusing the
current components, which is the explicit requirement.

## Why not Ionic / monorepo

The old spec's core worry was Ionic Vue's incompatibility with the current stack
(Vue 3.6 beta, Router 5). By **not using Ionic at all** and instead building the
native-feel primitives ourselves on top of Nuxt UI + Tailwind + Capacitor, that entire
risk class disappears:

- No Router 4-vs-5 conflict — we keep the current `vue-router` 5.
- No Vapor-vs-VDOM interop risk — we keep the current runtime as-is.
- No CSS collision between Ionic and Tailwind/Nuxt UI.
- No UI duplication — one component library, one design system, one build.

The trade-off: native navigation primitives (tab stack, page transitions, swipe-back)
are **not free out of the box** — we implement them. See
[Native feel primitives](#native-feel-primitives).

## Navigation structure

The mobile tab bar is **not** a 1:1 copy of the desktop `navItems`. Composition
(left to right):

1. **Home**
2. **Calendar**
3. **(+) actions** — center button, quick-create for appointment/time-off (mirrors
   desktop's [`quick-create-action`](../../src/widgets/quick-create-action) widget)
4. **Analytics**
5. **Settings**

**Services and Clients are not top-level tabs on mobile.** They move into a mobile
**Settings hub**, which becomes more than the current settings page:

- All existing settings sections unchanged (profile, contacts, working-hours, booking,
  payment-types, service-categories, notifications, system-region, account — see the
  `settings-*` routes in [`src/app/router/index.ts`](../../src/app/router/index.ts))
- **+ Services** ([`src/pages/services`](../../src/pages/services)) — reused as a Settings sub-section
- **+ Clients** ([`src/pages/clients`](../../src/pages/clients)) — reused as a Settings sub-section
- **+ About** — new section, doesn't exist on desktop or mobile today; built from scratch
  (app version, links — minimal content for the first iteration)

**Desktop is unaffected.** `DashboardLayout`'s navigation (Home/Calendar/Clients/
Services/Analytics/Settings) stays exactly as-is; Services and Clients remain
independent top-level desktop routes. This regrouping is mobile-only.

## Architecture

### One build, viewport-adaptive shell

The app stays a **single Vite build**. There is no separate mobile entry. What changes
by viewport is the **shell (layout) and a handful of dense screens**, not the component
library or the routes.

```
                        current stack (unchanged)
   ┌─────────────────────────────────────────────────────────┐
   │ Vue 3.6 beta · vue-router 5 · Nuxt UI v4 · Tailwind v4    │
   │ Pinia + @pinia/colada · Supabase · FSD · @/ aliases       │
   └─────────────────────────────────────────────────────────┘
                                │
              ┌─────────────────┴─────────────────┐
       desktop (≥ md)                       mobile (< md)
   DashboardLayout                     MobileShell (new widget)
   • vertical sidebar rail             • bottom tab bar (Home/Calendar/+/Analytics/Settings)
   • slideover notifications           • back-header per screen (no animation yet)
   • RouterView panel                  • safe-area insets
                                       • [later phase] transitions + swipe-back + status bar
                                │
                       wrapped by Capacitor
                       ┌────────────┴────────────┐
                     iOS                       Android
```

### Layout selection

Layouts are already switched by `meta.layout` on routes (see
[`src/app/router/index.ts`](../../src/app/router/index.ts) and
[`docs/architecture` calendar/auth-guard docs](../architecture/)). The dashboard tree is
nested under the [`DashboardLayout`](../../src/widgets/dashboard-layout/ui/DashboardLayout.vue)
widget. Mobile introduces a sibling **`MobileShell`** widget chosen at runtime by a
breakpoint check, so the same routes render inside the appropriate shell:

- **Desktop shell** — the current `DashboardLayout` (vertical `UDashboardSidebar` rail).
- **Mobile shell** — new widget with a bottom tab bar + per-screen header, driven by the
  same `navItems` source of truth.

Breakpoint detection uses `@vueuse/core`'s `useBreakpoints` (already a dependency; see
its usage across `src/features/**`). A single `useIsMobile()` composable in
`src/shared/lib` is the one place that decides "mobile vs desktop".

### Reusing the design system

Nothing about the design tokens changes. Mobile uses the exact same variables defined in
[`src/app/styles/main.css`](../../src/app/styles/main.css): `--ui-bg`, `--ui-text*`,
`--app-canvas`, `--shadow-panel`, `--ui-radius`, the amber accent, and the `.dark`
overrides. See [Themes and Variables](../design/themes-and-variables.md). Mobile-specific
additions are **additive** CSS custom properties (e.g. safe-area insets), never
replacements.

### Native feel primitives *(deferred — build after the mobile version works, not before)*

These are the pieces that make a Capacitor-wrapped web app feel like a real app. Each is
built on the current stack — no Ionic. **Sequencing note (2026-07-17):** none of these
are required for the shell, sheets, or per-screen adaptation work — those ship first with
plain, unanimated navigation. This table describes what gets layered on afterward, as its
own late implementation phase (see
[Mobile Implementation Plan](./mobile-implementation-plan.md)):

| Primitive | Approach |
|---|---|
| **Bottom tab bar** | New `MobileTabBar` component; Nuxt UI icons/links; `aria-current` active state; respects bottom safe-area inset. |
| **Back headers** | `MobileHeader` component with contextual title + back button; wired to `router.back()`. |
| **Page transitions** | Vue `<Transition>` / `<RouterView>` transition wrapping, direction-aware (push/pop) based on navigation history depth. |
| **Swipe-back gesture** | Edge-swipe listener that drives `router.back()`; native iOS behaviour also available via Capacitor. |
| **Haptics** | `@capacitor/haptics` on key interactions (tab switch, confirm, long-press). |
| **Status bar / splash** | `@capacitor/status-bar` + `@capacitor/splash-screen`, themed to `--app-canvas` (light) / zinc-950 (dark). |
| **Safe areas** | `env(safe-area-inset-*)` exposed as CSS vars, consumed by shell + overlays. |
| **Keyboard** | `@capacitor/keyboard` to avoid inputs being covered; adjust scroll on focus. |

### Screens that need real mobile redesign vs. cheap adaptation

Most pages adapt with Tailwind responsive prefixes. A few dense/desktop-first screens
need genuine mobile layouts:

- **Calendar** ([`src/pages/calendar`](../../src/pages/calendar), FullCalendar) — desktop
  week/time-grid is unusable on a phone; mobile needs a day/agenda view. This is the
  highest-effort screen. See [Calendar architecture](../architecture/calendar.md).
- **Home** ([`src/pages/home`](../../src/pages/home)) — schedule timeline; needs mobile
  spacing and the quick-create action repositioned above the tab bar.
- **Analytics** ([`src/pages/analytics`](../../src/pages/analytics)) — stat cards + charts
  reflow to a single column; charts get mobile sizing.
- **Wizards / modals** (appointment, time-off, settings) — become **full-screen sheets**
  on mobile instead of centered dialogs.

## Configuration

No mobile configuration exists yet — Capacitor is not installed. When it lands, config
will live in:

- `capacitor.config.ts` — appId (`com.seene.app` TBD), appName, `webDir: 'dist'`, server
  settings, plugin config (status bar, splash, keyboard).
- `ios/` and `android/` native project folders (generated by `npx cap add`), committed to
  the repo.
- New Capacitor plugin deps in `package.json` (`@capacitor/core`, `@capacitor/ios`,
  `@capacitor/android`, `@capacitor/status-bar`, `@capacitor/splash-screen`,
  `@capacitor/haptics`, `@capacitor/keyboard`).

Until then: `No configuration required.`

## Usage

There is no mobile code to use yet — this section fills in as primitives land. Intended
shape:

```ts
// src/shared/lib/viewport (planned)
import { useIsMobile } from '@shared/lib/viewport'

const isMobile = useIsMobile() // ComputedRef<boolean>, source of truth for shell choice
```

```vue
<!-- App shell choice (planned, e.g. in App.vue or a layout resolver) -->
<MobileShell v-if="isMobile" />
<DashboardLayout v-else />
```

## Status

| Area | Status |
|---|---|
| Direction & decisions | ✅ Locked 2026-07-16 |
| This doc | ✅ Created |
| Implementation plan | ✅ See [Mobile Implementation Plan](./mobile-implementation-plan.md) |
| **Phase 0 — spike gate** | ✅ **GO** — decided 2026-07-17, see below |
| `useIsMobile()` composable | ⬜ Not started |
| Mobile shell + tab bar | ⬜ Not started |
| Capacitor integration | ✅ Installed — `@capacitor/core`, `ios`, `android` + `haptics`/`status-bar`/`splash-screen`/`keyboard`, both native projects generated |
| **Phase 1 — shell, tab bar, Settings hub** | ✅ **Done** (`master.seene-x1ii.2`) — see below |
| Per-screen mobile layouts (Phase 4) | ⬜ Not started |
| Native-feel primitives (transitions/swipe-back/haptics) | ⬜ Not started — deferred, scheduled late (after all screens) |

### Phase 1 done (2026-07-17)

Built: `useIsMobile()` (`src/shared/lib/viewport`), `AppShell` widget (`src/widgets/app-shell`)
that reactively picks `MobileShell` vs `DashboardLayout` for the `/` route, and `MobileShell`
(`src/widgets/mobile-shell`) with `MobileTabBar` (Home/Calendar/(+)/Analytics/Settings, using
Nuxt UI's documented `UNavigationMenu` bottom-tab-bar pattern) and `MobileHeader` (back button +
title, shown instead of the tab bar on any non-root screen). The mobile Settings hub
(`_MobileEntryPage.vue`) lists all existing settings sections plus new **Services**, **Clients**,
and **About** entries; tapping one pushes to that screen via the same `<router-view>` outlet
(desktop's sidebar+content layout is untouched, chosen by a `_SettingsShell.vue` resolver). New
`settings-services` / `settings-clients` / `settings-about` child routes reuse `ServicesPage` /
`ClientsPage` directly — no duplication. Verified with Playwright screenshots at a 390×844
viewport (tab bar, settings hub, push navigation + back header, the (+) quick-create menu) and
at 1440×900 (desktop pixel-identical, confirmed against `DashboardLayout` and the settings
sidebar). No animations were added — plain, instant navigation only, per the revised sequencing
that defers native-feel primitives to Phase 2 (now scheduled after Phases 3–5).

_Update this table as phases from the implementation plan complete._

### Phase 0 gate decision: GO (2026-07-17)

A throwaway 2-screen prototype (bottom tab bar, back-header detail screen, direction-aware
page transition via Vue `<Transition>`, edge swipe-back via `@vueuse/core`'s `useSwipe`,
haptics via `@capacitor/haptics`) was built on the real stack and run inside Capacitor on
an iOS Simulator (iPhone 17 Pro, iOS 26.3). Confirmed by screenshot: Nuxt UI components,
Tailwind classes, and Lucide/iconify icons all render correctly inside the Capacitor
WKWebView with zero CSS conflicts — the core risk this spike existed to rule out.

**iOS:** built via `xcodebuild` (SPM dependency resolution, not CocoaPods — Capacitor 8
ships Swift Package Manager support), installed and launched on simulator, verified
visually. **Android:** `./gradlew assembleDebug` succeeded (`BUILD SUCCESSFUL`, all 4
plugins bundled), but runtime verification on an emulator is **blocked** — the dev
machine has only ~2 GB free disk space and the Android emulator refuses to boot
(`hasSufficientDiskSpace` check fails). This is a host environment issue, not a project
issue; free up disk space before attempting Android emulator runs.

**Decision: proceed to Phase 1.** No blocking risk found in the chosen approach (Nuxt UI
+ Tailwind + Capacitor, no Ionic). The throwaway spike code
(`src/pages/mobile-spike/*`, temporary router entries) has been deleted per its own
notes — nothing from the prototype is part of the real mobile shell. What ships from
Phase 0: `capacitor.config.ts`, the `ios/` and `android/` native projects, and the
Capacitor plugin dependencies in `package.json`.

## Cross-references

- [Mobile Implementation Plan](./mobile-implementation-plan.md) — the phased roadmap and starting point
- [Superseded: Capacitor + Ionic monorepo design](../superpowers/specs/2026-07-14-capacitor-ionic-mobile-design.md) — the abandoned earlier approach, kept for history
- [Themes and Variables](../design/themes-and-variables.md) — the `--ui-*` token system mobile reuses unchanged
- [Nuxt UI Components](../ui/nuxt-ui-components.md) — the component library used on both desktop and mobile
- [Overlays](../ui/overlays.md) — modal/slideover patterns that become full-screen sheets on mobile
- [Calendar](../architecture/calendar.md) — the highest-effort screen to redesign for mobile
- [Analytics and Home](../architecture/analytics-and-home.md) — dashboard screens needing single-column reflow
- [Auth Guard](../architecture/auth-guard.md) — routing/guard behavior the mobile shell must preserve

## File Structure

Built (Phase 0 + Phase 1):

- `src/shared/lib/viewport/model/use-is-mobile.ts` — `useIsMobile()`, wraps `@vueuse/core`'s
  `useBreakpoints(breakpointsTailwind)` at the `md` boundary
- `src/widgets/app-shell/ui/AppShell.vue` — reactive `MobileShell` vs `DashboardLayout` switch,
  registered as the `/` route's component in `src/app/router/index.ts`
- `src/widgets/mobile-shell/ui/MobileShell.vue` — mobile app shell: hides/shows
  `MobileTabBar`/`MobileHeader` based on whether the current route is one of the 4 tab roots
- `src/widgets/mobile-shell/ui/MobileTabBar.vue` — Home/Calendar/(+)/Analytics/Settings,
  `UNavigationMenu` bottom-tab-bar pattern; (+) calls `useQuickCreate().openMenu()`
- `src/widgets/mobile-shell/ui/MobileHeader.vue` — back button + title, no animation
- `src/pages/settings/ui/_SettingsShell.vue` — picks `_EntryPage.vue` (desktop) vs
  `_MobileEntryPage.vue` (mobile hub); desktop's redirect-to-profile is a router `beforeEnter`
  guard now (`src/app/router/index.ts`), not a static route redirect, so it can be conditional
- `src/pages/settings/ui/_MobileEntryPage.vue` — mobile Settings hub list (General/Workspace/
  System groups); shows `<router-view>` instead of the list once a child route is active
- `src/pages/settings/ui/SettingsAboutPage.vue` — new About section (minimal first-iteration
  content: version string)
- New routes `settings-services` / `settings-clients` / `settings-about` reuse `ServicesPage` /
  `ClientsPage` directly (no duplication)
- Safe-area CSS vars (`--safe-area-top/bottom/left/right`) in `src/app/styles/main.css`
- `capacitor.config.ts` — Capacitor project config
- `ios/`, `android/` — native projects
