---
spec_version: 1.0
date: 2026-09-09
status: built
skill_slug: ionic-components
skill_name: Ionic Component Expert
targets: [claude-code, codex, universal]
---

# Ionic Component Expert — Skill Specification

> Spec v1.0 · 2026-09-09 · status: built · [Skills index](./README.md)

## 1. Purpose

This skill gives an agent **deep, working knowledge of the Ionic (`@ionic/vue` v9) component library and its interaction primitives** — the "kitchen" of Ionic. It answers three questions authoritatively: *what components exist*, *which component to reach for a given UI job*, and *how to use it idiomatically* (props, slots, events, and the pattern it belongs to). It is the knowledge layer that turns "build a mobile list with pull-to-refresh, swipe actions and paging" into the correct concrete Ionic components used the way Ionic intends.

It is deliberately **separate from the other two Ionic skills** and complements them:
- [[mobile-ionic]] owns *placement and wiring in this repo* — where a mobile file goes (`ui-mobile/`, `index.mobile.ts`), routing, the tab shell, plugins, "no Nuxt UI in the mobile bundle", "reuse the entity/i18n layer". It already says "maximize use of built-in Ionic components before hand-rolling" — this skill is the knowledge that makes that possible.
- [[mobile-ionic-theming]] owns *colors and styles* — surfaces, separators, CSS variables, `:deep()` overrides.
- **This skill** owns *component selection and correct usage* — the catalog, decision guidance, slots/props, and the interaction patterns (gestures, refresher/infinite scroll, overlays, lifecycle, platform modes).

Its value: the agent picks the right Ionic component the first time, uses its real API (correct slots, `slot="start/end"`, controller vs. inline overlay, `ion-*` events), and applies Ionic's canonical patterns instead of reinventing them with raw markup — producing screens that look and feel native on both iOS and Android.

## 2. When to trigger

**Should trigger:**
- Direct component questions: "which Ionic component for a bottom sheet?", "how do I use `IonItemSliding`?", "what's the difference between `IonModal` and `IonPopover`?", "how do I do pull-to-refresh in Ionic?", "какой Ionic-компонент для выпадающего списка?".
- Choosing between components for a UI job on a mobile screen: lists vs. cards, `IonSelect` vs. `IonPicker` vs. `action sheet`, `IonSegment` vs. tabs, `IonAlert` vs. `IonModal` for a confirm, inline overlay vs. `*Controller`.
- Building an interaction pattern: pull-to-refresh (`IonRefresher`), infinite scroll / paging (`IonInfiniteScroll`), swipe actions (`IonItemSliding`), reorder (`IonReorderGroup`), FAB actions (`IonFab`), searchbar filtering, accordion sections, date/time entry (`IonDatetime`), sliders (`IonRange`).
- Using Ionic **interaction primitives**: overlay controllers (`toastController`, `alertController`, `actionSheetController`, `modalController`, `popoverController`, `loadingController`), page lifecycle hooks (`onIonViewWillEnter`/`DidEnter`/`WillLeave`), custom gestures (`createGesture`) and animations (`createAnimation`), and iOS vs. Material Design (`md`) platform modes.
- **Companion mode:** any time [[mobile-ionic]] is building or editing a `ui-mobile/` screen and a component/pattern choice arises, this skill supplies the component-level detail. The two run together.

**Should NOT trigger:**
- *Where a file goes / how the mobile target is wired* (routing, `index.mobile.ts`, plugins, "why is Nuxt UI in the bundle") — that's [[mobile-ionic]].
- *What color/surface/separator to use, CSS variables, `:deep()` styling* — that's [[mobile-ionic-theming]].
- Desktop web work with Nuxt UI (`U*` components) — that's [[nuxt-ui]]. Ionic and Nuxt UI never mix in one bundle.
- **Capacitor native APIs** (Camera, Geolocation, Preferences, Haptics, Push, filesystem) — out of scope for this skill; it covers the Ionic *UI framework* and its interaction primitives only.
- Pure entity/data-layer or i18n changes — [[fsd]] / [[i18n]].

This section feeds the built skill's `description`. It must co-exist with `mobile-ionic` (wiring), `mobile-ionic-theming` (styling), and negate `nuxt-ui` (desktop-only).

## 3. Inputs

- **User request** — a component question, a "which component for X" decision, or an in-progress mobile screen needing a component/pattern.
- **The target `.vue` file** (usually under `src/pages/*/ui-mobile/` or `src/features/*/ui-mobile/`) when embedded in a build.
- **Existing repo usage as the house style** — the ~40 Ion components already in use are the canonical examples (see §6). New code should match how they are used here.
- **Authoritative API** — the Ionic docs and, when a prop/slot/event is uncertain, **context7 for `@ionic/vue`** (the repo is on v9; do not guess v6/v7 APIs).

## 4. Outputs

- A **recommendation and/or `.vue` markup** using the correct Ionic components, with the right slots (`slot="start"`, `slot="end"`, `slot="header"`, `slot="content"`), events (`@ionInput`, `@ionChange`, `@ionRefresh`, `@ionInfinite`), and the appropriate overlay mechanism (inline `IonModal` with `v-model:is-open` vs. `*Controller`).
- When answering a "which component" question: a **short decision** (the pick + one-line why + the key props/slots), not an essay.
- Interaction patterns wired correctly (e.g. `IonRefresher` → `$event.target.complete()`; `IonInfiniteScroll` → disable when no more data).
- Icons from `ionicons/icons` (never Lucide). All visible text via i18n ([[i18n]]). Placement/wiring deferred to [[mobile-ionic]]; styling to [[mobile-ionic-theming]].

No fixed message template. In companion mode, produce markup that drops into the screen [[mobile-ionic]] is building.

## 5. Workflow

Host-neutral logic. A materializing agent adapts it to its tool calls.

### 5.1 Decision procedure (the core loop)
1. **Name the UI job** in Ionic terms (a list, a form control, a confirm, an overlay, a navigation surface, a pull/scroll interaction).
2. **Map the job to the component family** using the catalog in §5.2. Prefer a built-in Ionic component + its documented pattern over hand-rolled markup.
3. **Pick inline vs. controller for overlays** using §5.3.
4. **Confirm the exact API** — slots, props, events — against the repo's existing usage first, then Ionic docs / context7 (`@ionic/vue` v9) if anything is uncertain. Never invent props.
5. **Write idiomatic markup**, matching how the component is already used in this repo. Wire events to their completion contracts (refresher/infinite scroll). Defer file placement to [[mobile-ionic]], colors/spacing to [[mobile-ionic-theming]], text to [[i18n]], icons to `ionicons/icons`.

### 5.2 Component catalog by job (what to reach for)
- **Page scaffold:** `IonPage` > `IonHeader` > `IonToolbar` (`IonTitle`, `IonButtons slot="start|end"`, `IonBackButton`) > `IonContent`. Collapsible large title = a second `IonHeader collapse="condense"` inside `IonContent`.
- **Lists & rows:** `IonList`, `IonItem` (interactive `button`/`detail`, or `IonItem` with `slot` children), `IonLabel`, `IonNote` (metadata, `slot="end"`), `IonListHeader`, `IonItemGroup` + `IonItemDivider`. Avatars/thumbnails via `IonAvatar`/`IonThumbnail` `slot="start"`.
- **Swipe actions:** `IonItemSliding` > `IonItem` + `IonItemOptions` (`side="end|start"`) > `IonItemOption` (`color="danger"` for destructive; confirm destructive with `alertController`).
- **Reorder:** `IonReorderGroup` (`@ionItemReorder`, call `$event.detail.complete()`) with `IonReorder` handles.
- **Cards:** `IonCard` (`IonCardHeader`/`IonCardTitle`/`IonCardSubtitle`/`IonCardContent`) — for standalone content blocks, not dense lists.
- **Form controls:** `IonInput`, `IonTextarea` (both use `@ionInput`/`v-model`; `label` + `labelPlacement`), `IonSelect`/`IonSelectOption` (`interface="popover|action-sheet|alert"`), `IonToggle`, `IonCheckbox`, `IonRadioGroup`/`IonRadio`, `IonRange`, `IonDatetime` (+ `IonDatetimeButton` in a modal), `IonSearchbar` (`@ionInput` for filtering). Group with `IonList` + inset items; validate with `IonNote color="danger"`.
- **Buttons & actions:** `IonButton` (`fill="clear|outline|solid"`, `expand="block"`), `IonFab` + `IonFabButton` (+ `IonFabList` for a speed-dial), `IonChip`.
- **Navigation surfaces:** `IonTabs`/`IonTabBar`/`IonTabButton` (bottom tabs — owned by [[mobile-ionic]]'s `TabsPage.vue`), `IonSegment`/`IonSegmentButton` (in-page view switch), `IonBreadcrumbs`, `IonBackButton`.
- **Disclosure:** `IonAccordionGroup` + `IonAccordion` (`slot="header"` / `slot="content"`).
- **Feedback & status:** `IonSpinner` (whole-screen busy), `IonSkeletonText` (list/detail placeholders), `IonProgressBar`, `IonBadge`, `IonText`.
- **Pull / scroll interactions:** `IonRefresher` + `IonRefresherContent` (`@ionRefresh` → `$event.target.complete()` after reload); `IonInfiniteScroll` + `IonInfiniteScrollContent` (`@ionInfinite` → append page, `$event.target.complete()`, set `disabled` when exhausted).
- **Grid/layout when needed:** `IonGrid`/`IonRow`/`IonCol` (sparingly — lists/cards usually suffice).

### 5.3 Overlays: inline vs. controller
- **Inline component (`v-model:is-open`)** — `IonModal`, `IonPopover`: use when the overlay's content is a template that belongs to the page (a form, a detail sheet). This is the repo's default (`IonModal` is used with `v-model:is-open` and a `presenting-element` prop for iOS card presentation). Bottom sheet = `IonModal` with `:breakpoints` + `:initial-breakpoint`.
- **Imperative controller** — `toastController` (transient feedback; the repo's standard for success/error), `alertController` (confirms, especially destructive), `actionSheetController` (a short list of contextual actions from the bottom), `loadingController` (blocking spinner), `modalController`/`popoverController` (when the overlay is created programmatically without a template slot). Always `await`; always dismiss.
- **Rule of thumb:** template-driven & reusable → inline; fire-and-forget or created in a handler → controller. Match the repo (`toastController`/`alertController` are already the house style).

### 5.4 Interaction primitives
- **Lifecycle:** use Ionic's page hooks (`onIonViewWillEnter`, `onIonViewDidEnter`, `onIonViewWillLeave`, `onIonViewDidLeave`) rather than only Vue's `onMounted`, because Ionic keeps pages alive in the navigation stack — a page is *re-entered* without remounting. Refresh data on `ionViewWillEnter`.
- **Gestures:** `createGesture({...})` for custom drag/swipe beyond `IonItemSliding`; prefer the built-in component when one exists.
- **Animations:** `createAnimation()` for custom transitions; most overlays already animate correctly by default.
- **Platform modes:** Ionic renders `ios` or `md` styling per platform. Don't hardcode platform-specific spacing; let mode drive it, and test both. Component behavior (e.g. `IonSelect` default interface) can differ by mode.

### 5.5 Guardrails
- Verify props/slots/events against v9 (repo usage first, then context7 `@ionic/vue`) — never carry over guessed or older-version APIs.
- Icons only from `ionicons/icons`. Text only via [[i18n]]. Colors only per [[mobile-ionic-theming]] (Ionic `color` prop values map to theme, don't hardcode hex). Placement/wiring only per [[mobile-ionic]].
- Prefer a built-in component + its documented pattern over hand-rolled `<div>` markup.
- Wire completion contracts: refresher and infinite-scroll must call `.complete()`; reorder must call `$event.detail.complete()`.

## 6. Resources

- **Ionic components docs** — https://ionicframework.com/docs/components (authoritative catalog, props/slots/events). Use **context7 `@ionic/vue`** when an API detail is uncertain; the repo is on **v9**.
- **Ionicons** — https://ionic.io/ionicons (icon names; import from `ionicons/icons`).
- **Canonical in-repo usage** (read before writing; these are the house style):
  - Lists + swipe + skeleton + toast/alert: `src/pages/clients/ui-mobile/ClientsMobilePage.vue`, `ClientDetailMobilePage.vue`.
  - Inline `IonModal` feature with `presenting-element`: `src/features/client-form/ui-mobile/ClientFormMobile.vue`.
  - Tab shell (`IonTabs`/`IonTabBar`): `src/app-mobile/ui/TabsPage.vue`.
  - Segments, selects, toggles, FAB, reorder: grep `src/pages/*/ui-mobile` and `src/features/*/ui-mobile` for the specific `Ion*` tag.
- No bundled scripts needed. A compact **component-catalog reference sheet** (§5.2 as a lookup table, plus the inline-vs-controller rule) is worth bundling as `references/ionic-catalog.md` for the Claude Code build.

## 7. Examples

**Example A — "which component" question**

Input: "How do I add pull-to-refresh to the mobile clients list?"
Output: Use `IonRefresher` + `IonRefresherContent` as the first child of `IonContent`; on `@ionRefresh` refetch the `@entities/client` query and call `$event.target.complete()` when done. (No new component needed elsewhere; placement stays in the existing `ClientsMobilePage.vue`.)

**Example B — component selection with a rationale**

Input: "I need a confirm before deleting a client on mobile — modal or something else?"
Output: Use `alertController.create({ header, message, buttons: [cancel, { text, role: 'destructive' }] })`, not an `IonModal` — a destructive confirm is a fire-and-forget decision, so the controller is idiomatic and matches the repo's existing delete flows. Reserve `IonModal` for form/detail content.

**Example C — companion build**

Input (from a mobile-ionic build): "Add a segment to switch between 'Upcoming' and 'Past' appointments on the detail page."
Output: `IonSegment` (`v-model` on a reactive `view` ref, `@ionChange`) with two `IonSegmentButton`s in the `IonToolbar` or top of `IonContent`; conditionally render the two lists. Wire text via i18n; [[mobile-ionic]] handles the file/route.

**Example D — should NOT trigger**

Input: "Where should the mobile appointments page file live?" → [[mobile-ionic]]. / "What background color for the card?" → [[mobile-ionic-theming]]. / "Add a UButton to the desktop page." → [[nuxt-ui]].

## 8. Acceptance criteria

- For a "which component" question, the answer names a specific Ion component (or controller), states the key slots/props/events, and gives a one-line rationale — no hand-rolled `<div>` substitute when a built-in fits.
- Any markup produced uses correct v9 slots/props/events (verified against repo usage or context7), correct overlay mechanism (inline `IonModal`/`IonPopover` vs. `*Controller`), and `ionicons/icons` for icons.
- Interaction patterns wire their completion contracts: `IonRefresher`/`IonInfiniteScroll` call `.complete()`; `IonReorderGroup` calls `$event.detail.complete()`; infinite scroll disables when exhausted.
- The skill stays in its lane: it does not decide file placement/routing (defers to `mobile-ionic`), colors/CSS variables (defers to `mobile-ionic-theming`), or use Nuxt UI; text goes through i18n.
- Recommendations match the repo's established house style (`toastController`/`alertController`, inline `IonModal` with `presenting-element`, skeleton placeholders) rather than a generic Ionic tutorial.
- When companion to a `mobile-ionic` build, the produced markup drops into the target `ui-mobile/` screen and passes `bun run type-check` + `bun lint`.

## 9. Target adaptation

### 9.1 Claude Code
Build `.claude/skills/ionic-components/SKILL.md` (project-level). Frontmatter `name: ionic-components`; `description` encodes §2 triggers (component questions, "which Ionic component for X", interaction patterns — refresher/infinite scroll/swipe/reorder/FAB/segment/accordion/datetime, overlay controllers, lifecycle hooks, gestures/animations, iOS/MD modes; companion to mobile builds) and the negatives (wiring→mobile-ionic, styling→mobile-ionic-theming, Nuxt UI→nuxt-ui, Capacitor native out of scope). Body = §5: the decision procedure, the component-by-job catalog, the inline-vs-controller rule, and the interaction primitives, kept tight. Bundle `references/ionic-catalog.md` (the §5.2 lookup + §5.3 rule) so the agent doesn't reload the whole spec. Cross-link `mobile-ionic`, `mobile-ionic-theming`, `i18n`, `nuxt-ui`. No scripts/assets required. Note in the body to consult context7 `@ionic/vue` (v9) for uncertain APIs.

### 9.2 Codex / AGENTS.md
Add an `## Ionic Components` section to `AGENTS.md` (or `.codex/` instructions): the decision procedure (name the job → map to component family → inline vs. controller → verify v9 API → write idiomatic markup), a condensed job→component table, the completion-contract reminders, and the lane boundaries (wiring/styling/Nuxt UI). Keep it imperative and short; point to the canonical in-repo files and the Ionic docs / context7.

### 9.3 Universal
Any agent, given only this spec, can: identify the UI job, map it to the right Ion component family (§5.2), choose inline overlay vs. controller (§5.3), verify the v9 API against repo usage or the Ionic docs, and emit idiomatic markup with correct slots/events and `ionicons` icons — while deferring placement, styling, and text to the sibling skills. The portable core is: prefer built-in components + their documented patterns, verify the API, and wire completion contracts.

## 10. Materialization log

| Tool        | Location                              | Built from spec v | Date |
|-------------|---------------------------------------|-------------------|------|
| claude-code | .claude/skills/ionic-components/      | 1.0               | 2026-09-09 |
| codex       | AGENTS.md#ionic-components            | —                 | —    |

## 11. Changelog

- v1.0 — Initial spec: Ionic component-knowledge skill (catalog by UI job, inline-vs-controller overlay rule, interaction primitives — gestures/lifecycle/refresher/infinite-scroll, iOS/MD modes), scoped to the Ionic UI framework (Capacitor native excluded), standalone + companion to `mobile-ionic`, grounded in the repo's v9 usage.
</content>
</invoke>
