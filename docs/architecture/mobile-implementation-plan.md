---
version: 1.1
date: 2026-07-17
category: architecture
---

# Mobile Implementation Plan

> Version 1.1 · 2026-07-17 · [Architecture](../architecture/)

> Companion to [Mobile Version](./mobile-version.md). That doc holds the *what* and *why*;
> this one holds the *order of work* — where to start and how to move. Beads tasks are
> created from these phases.

## Overview

The goal is a **native-feeling mobile app built on the current Nuxt UI stack, wrapped in
Capacitor for iOS + Android**. We move in phases that each end in something runnable and
reviewable. The guiding rule *(revised 2026-07-17)*: **get the whole mobile version
functionally correct first — shell, navigation, every screen — with plain, unanimated
interactions, then layer native-feel animations and gestures on top once nothing about
the screens is still changing.** The Phase 0 spike already proved the underlying
Capacitor + Nuxt UI combination *can* feel native when we get there; it doesn't need to
be proven again screen by screen.

Sequencing principle *(revised 2026-07-17 — native feel is now last, not second)*:

1. Foundation first (breakpoint switch, mobile shell, Capacitor build) — so every later
   screen has a place to live and a device to run on. The shell ships with **plain,
   unanimated navigation** at this stage — no transitions, no swipe-back yet.
2. Sheets + screens next, cheapest-first (adapt with Tailwind), hardest-last (calendar) —
   this is where the mobile version becomes functionally complete.
3. **Native-feel primitives last**, once every screen already works. The earlier plan
   ("bake in native feel from the start") is reversed: animations and gestures are
   polish layered onto a finished, working mobile version, not a prerequisite for it.
   Phase 2 (native-feel) now depends on Phases 3, 4, and 5 completing, and blocks
   only Phase 6.

## Phases

### Phase 0 — Spike: prove the native feel (gate)

**Why:** de-risk before committing. Confirm that Nuxt UI + Tailwind + Capacitor + our own
transition/gesture layer actually *feels* native, without Ionic.

- Install Capacitor (`@capacitor/core`, `ios`, `android`), `capacitor.config.ts`,
  `npx cap add ios android`.
- Build the current app and run it on a real device / simulator via Capacitor.
- Throwaway 2-screen prototype: bottom tab bar + a back-header detail screen + one page
  transition + swipe-back.
- **Gate:** if transitions/swipe-back feel wrong and can't be fixed with reasonable
  effort → revisit approach (e.g. a dedicated transition lib, or reconsider Ionic) before
  building more.

_Output: a go/no-go decision recorded in [Mobile Version](./mobile-version.md)._

### Phase 1 — Foundation: viewport switch + mobile shell

**Why:** everything else renders inside this.

- `useIsMobile()` composable in `src/shared/lib/viewport/` (via `@vueuse/core`
  `useBreakpoints`), single source of truth for shell choice.
- Safe-area CSS variables (`env(safe-area-inset-*)`) wired into global styles.
- `MobileShell` widget (`src/widgets/mobile-shell/`): bottom tab bar (Home, Calendar,
  (+) actions, Analytics, Settings) + per-screen back-header + a **plain, unanimated**
  `<RouterView>` — no transitions or swipe-back at this stage, that's Phase 2 now.
- Mobile Settings becomes a hub: existing settings sections + **Services** + **Clients**
  (both reused from their current desktop pages) + a new **About** section.
- Runtime shell selection: mobile → `MobileShell`, desktop → `DashboardLayout`, same routes.
- **Acceptance:** on a narrow viewport the app shows the 4-tab bar + actions button,
  navigates between Home / Calendar / Analytics / Settings, and Settings surfaces
  Services/Clients/About; desktop is byte-for-byte unchanged.

### Phase 3 — Overlays → mobile sheets

**Why:** modals/wizards are everywhere; they must not look like desktop dialogs on a phone.

- Adapt appointment wizard, time-off wizard, settings modals, emoji picker, notifications
  to render as **full-screen / bottom sheets** on mobile, centered dialogs on desktop.
- Keyboard-safe inputs inside sheets.
- Open/close is **plain** for now (no swipe-to-dismiss, no custom enter/leave animation)
  — standard `UModal`/`USlideover` behavior is enough; gesture polish is Phase 2, deferred.
- **Acceptance:** the appointment-creation flow is comfortable and thumb-reachable on a phone.

### Phase 4 — Screen adaptation (cheap first)

Adapt with Tailwind responsive prefixes and single-column reflow. One task per screen group:

- **Home** — mobile spacing, quick-create action above the tab bar.
- **Clients** — reached via Settings → Clients (not a tab); list + detail as a push/back
  flow instead of a side panel.
- **Services** — reached via Settings → Services (not a tab); single-column cards,
  category management usable on mobile.
- **Settings** — the hub itself: stacked rows, section navigation as push screens,
  surfaces Services/Clients/About alongside the existing sections.
- **Analytics** — stat cards + charts reflow to one column with mobile chart sizing.
- **Auth / onboarding** — verify the existing flows on mobile viewports + safe areas.

### Phase 5 — Calendar mobile view (highest effort)

**Why:** FullCalendar week/time-grid is unusable on a phone; needs its own view.

- Mobile day/agenda view (day columns, list agenda, or a compact day time-grid).
- Tap-to-create + tap-to-open wired to the mobile sheets from Phase 3.
- **Acceptance:** a master can view and create appointments for a day entirely on a phone.

### Phase 2 — Native-feel primitives *(moved here — now runs after Phases 3, 4, 5)*

**Why:** reversed 2026-07-17. Originally scheduled right after Phase 1 ("bake native feel
in from the start"); now deliberately last before ship polish, once the mobile version is
functionally complete on every screen. No point animating navigation that's still being
reshaped screen by screen.

- `MobileTabBar` + `MobileHeader` get transition/gesture polish (base components already
  shipped, unanimated, in Phase 1).
- Direction-aware page transitions (push vs pop from history depth).
- Edge swipe-back gesture → `router.back()`.
- Sheet open/close gets swipe-to-dismiss + custom animation (base sheets already shipped,
  plain, in Phase 3).
- Capacitor plugins: `@capacitor/status-bar`, `@capacitor/splash-screen`,
  `@capacitor/haptics`, `@capacitor/keyboard` — themed to the design tokens.
- **Acceptance:** navigating in/out of a nested screen animates correctly, swipe-back
  works, status bar + splash are themed, tab switches give haptic feedback — applied
  across every already-working screen (Settings hub, sheets, Home/Calendar/Analytics/
  Clients/Services/Auth, calendar) without regressing their functionality.

### Phase 6 — Ship polish

- App icons, splash assets, launch config for both platforms.
- Performance pass: fast cold start, lazy routes verified, bundle check.
- Device QA matrix (iOS + Android, notched + non-notched, dark mode).
- Store metadata / build pipeline notes → new `docs/deploy/` doc when we get there.

## Dependency graph

*(revised 2026-07-17 — Phase 2 moved to the end)*

```
Phase 0 (spike / gate)
   └─> Phase 1 (foundation: shell, tab bar, Settings hub — unanimated)
          ├─> Phase 3 (sheets, plain — no gesture dismiss)
          │      └─> Phase 5 (calendar, uses sheets)
          └─> Phase 4 (screens, cheap: Home/Clients/Services/Settings/Analytics/Auth)
                 │
                 ▼
          Phase 2 (native-feel primitives — transitions, swipe-back, haptics)
          depends on: Phase 3 + Phase 4 + Phase 5 all complete
                 │
                 ▼
          Phase 6 (ship polish)
```

Phase 3 and Phase 4 run in parallel straight off Phase 1 (no need to wait for native feel
anymore). Phase 5 depends on Phase 3 (sheets). **Phase 2 now depends on Phases 3, 4, and 5
all being done** — it's polish applied to a functionally finished mobile version, not a
foundation the rest builds on. Phase 6 depends on everything, including Phase 2.

## Where to start

**Phase 0 is done (GO, 2026-07-17)** — Capacitor is installed, native iOS/Android
projects exist, and a throwaway prototype proved Nuxt UI + Tailwind render cleanly inside
Capacitor's WebView with no conflicts. See the [Phase 0 gate decision](./mobile-version.md#phase-0-gate-decision-go-2026-07-17)
for details.

**Start with Phase 1** (`master.seene-x1ii.2`): the viewport switch, `MobileShell`, the
tab bar (Home/Calendar/+/Analytics/Settings), and the Settings hub (+Services/+Clients/
+About) — all with plain, unanimated navigation. Native-feel primitives (Phase 2) are
deliberately deferred until Phases 3–5 are done; don't front-load them.

## Cross-references

- [Mobile Version](./mobile-version.md) — the living overview: decisions, architecture, primitives, status
- [Superseded: Capacitor + Ionic monorepo design](../superpowers/specs/2026-07-14-capacitor-ionic-mobile-design.md) — abandoned earlier approach
- [Calendar](../architecture/calendar.md) — context for the Phase 5 mobile calendar
- [Overlays](../ui/overlays.md) — modal patterns adapted to sheets in Phase 3
- [Nuxt UI Components](../ui/nuxt-ui-components.md) — component library reused across all screens

## File Structure

This doc maps to no source files yet; see the [Mobile Version file structure](./mobile-version.md#file-structure)
for the planned layout.
