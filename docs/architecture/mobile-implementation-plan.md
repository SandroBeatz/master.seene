---
version: 1.0
date: 2026-07-16
category: architecture
---

# Mobile Implementation Plan

> Version 1.0 · 2026-07-16 · [Architecture](../architecture/)

> Companion to [Mobile Version](./mobile-version.md). That doc holds the *what* and *why*;
> this one holds the *order of work* — where to start and how to move. Beads tasks are
> created from these phases.

## Overview

The goal is a **native-feeling mobile app built on the current Nuxt UI stack, wrapped in
Capacitor for iOS + Android**. We move in phases that each end in something runnable and
reviewable. The guiding rule: **prove the native feel early on a thin vertical slice,
then widen screen by screen.** Never rebuild the whole app before knowing the shell feels
right.

Sequencing principle:

1. Foundation first (breakpoint switch, mobile shell, Capacitor build) — so every later
   screen has a place to live and a device to run on.
2. Native-feel primitives next — because "full native feel from the start" was chosen;
   we don't want to retrofit transitions onto 10 finished screens.
3. Screens last, cheapest-first (adapt with Tailwind), hardest-last (calendar).

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
- `MobileShell` widget (`src/widgets/mobile-shell/`): bottom tab bar + per-screen header +
  a `<RouterView>` transition outlet. Reuses the same `navItems` as `DashboardLayout`.
- Runtime shell selection: mobile → `MobileShell`, desktop → `DashboardLayout`, same routes.
- **Acceptance:** on a narrow viewport the app shows a bottom tab bar and navigates
  between Home / Calendar / Clients / Services; desktop is byte-for-byte unchanged.

### Phase 2 — Native-feel primitives

**Why:** chosen to bake native feel in from the start.

- `MobileTabBar` + `MobileHeader` as polished shared components (safe-area aware,
  `aria-current` active state, back button → `router.back()`).
- Direction-aware page transitions (push vs pop from history depth).
- Edge swipe-back gesture → `router.back()`.
- Capacitor plugins: `@capacitor/status-bar`, `@capacitor/splash-screen`,
  `@capacitor/haptics`, `@capacitor/keyboard` — themed to the design tokens.
- **Acceptance:** navigating in/out of a nested screen animates correctly, swipe-back
  works, status bar + splash are themed, tab switches give haptic feedback.

### Phase 3 — Overlays → mobile sheets

**Why:** modals/wizards are everywhere; they must not look like desktop dialogs on a phone.

- Adapt appointment wizard, time-off wizard, settings modals, emoji picker, notifications
  to render as **full-screen / bottom sheets** on mobile, centered dialogs on desktop.
- Keyboard-safe inputs inside sheets.
- **Acceptance:** the appointment-creation flow is comfortable and thumb-reachable on a phone.

### Phase 4 — Screen adaptation (cheap first)

Adapt with Tailwind responsive prefixes and single-column reflow. One task per screen group:

- **Home** — mobile spacing, quick-create action above the tab bar.
- **Clients** — list + detail as a push/back flow instead of a side panel.
- **Services** — single-column cards, category management usable on mobile.
- **Settings** — stacked rows, section navigation as push screens.
- **Analytics** — stat cards + charts reflow to one column with mobile chart sizing.
- **Auth / onboarding** — verify the existing flows on mobile viewports + safe areas.

### Phase 5 — Calendar mobile view (highest effort)

**Why:** FullCalendar week/time-grid is unusable on a phone; needs its own view.

- Mobile day/agenda view (day columns, list agenda, or a compact day time-grid).
- Tap-to-create + tap-to-open wired to the mobile sheets from Phase 3.
- **Acceptance:** a master can view and create appointments for a day entirely on a phone.

### Phase 6 — Ship polish

- App icons, splash assets, launch config for both platforms.
- Performance pass: fast cold start, lazy routes verified, bundle check.
- Device QA matrix (iOS + Android, notched + non-notched, dark mode).
- Store metadata / build pipeline notes → new `docs/deploy/` doc when we get there.

## Dependency graph

```
Phase 0 (spike / gate)
   └─> Phase 1 (foundation)
          └─> Phase 2 (native primitives)
                 ├─> Phase 3 (sheets)
                 │      └─> Phase 5 (calendar, uses sheets)
                 └─> Phase 4 (screens, cheap)  ──> Phase 6 (ship polish)
```

Phase 3 and Phase 4 can largely run in parallel once Phase 2 lands. Phase 5 depends on
Phase 3 (sheets). Phase 6 depends on everything.

## Where to start

**Start with Phase 0.** Install Capacitor, get the current build running on a device, and
throw a 2-screen native-feel prototype at it. That single spike answers the only question
that can still sink this approach — whether we can get native navigation feel without
Ionic — before we invest in the real shell and screens.

## Cross-references

- [Mobile Version](./mobile-version.md) — the living overview: decisions, architecture, primitives, status
- [Superseded: Capacitor + Ionic monorepo design](../superpowers/specs/2026-07-14-capacitor-ionic-mobile-design.md) — abandoned earlier approach
- [Calendar](../architecture/calendar.md) — context for the Phase 5 mobile calendar
- [Overlays](../ui/overlays.md) — modal patterns adapted to sheets in Phase 3
- [Nuxt UI Components](../ui/nuxt-ui-components.md) — component library reused across all screens

## File Structure

This doc maps to no source files yet; see the [Mobile Version file structure](./mobile-version.md#file-structure)
for the planned layout.
