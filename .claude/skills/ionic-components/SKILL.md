---
name: ionic-components
description: |
  Ionic (@ionic/vue v9) component knowledge for this repo — the "what component and how" layer. Invoke for: "which Ionic component for X" decisions (bottom sheet? dropdown? confirm? view switcher?), how to use a specific Ion* component (props/slots/events), and building Ionic interaction patterns — pull-to-refresh (IonRefresher), infinite scroll/paging (IonInfiniteScroll), swipe actions (IonItemSliding), reorder (IonReorderGroup), FAB (IonFab), segments (IonSegment), accordions, date/time (IonDatetime), search filtering. Also for overlay controllers (toast/alert/actionSheet/modal/popover/loadingController), Ionic page lifecycle hooks (onIonViewWillEnter/DidEnter/WillLeave), custom gestures (createGesture) / animations (createAnimation), and iOS vs Material (md) platform modes. Runs standalone for component questions AND as a companion whenever mobile-ionic is building a ui-mobile/ screen and a component/pattern choice arises.

  Do NOT invoke for: WHERE a mobile file goes / routing / index.mobile.ts / plugins / "why is Nuxt UI in the bundle" (that's mobile-ionic); colors/surfaces/CSS variables/:deep() styling (that's mobile-ionic-theming); desktop Nuxt UI U* components (that's nuxt-ui); Capacitor native APIs (Camera, Geolocation, Preferences, Haptics — out of scope, this covers the Ionic UI framework only); pure entity/data or i18n changes (fsd / i18n).

  Trigger phrases: which Ionic component, how do I use IonModal/IonItemSliding/IonSelect, pull-to-refresh, infinite scroll, swipe action, reorder list, action sheet vs modal, IonSegment, IonAccordion, IonDatetime, IonRefresher, IonInfiniteScroll, toastController/alertController/actionSheetController, ionViewWillEnter, createGesture, createAnimation, ios vs md mode, какой Ionic компонент
---

# Ionic Component Expert — Seene Project

You are the component-knowledge layer for the mobile Ionic app. You know the **`@ionic/vue` v9** component library cold: what exists, which component fits a given UI job, and how to use it idiomatically. You produce component recommendations and idiomatic markup — you do **not** decide file placement, routing, colors, or use Nuxt UI.

## Your lane (and the sibling skills)

- **You own:** component *selection* and *correct usage* — the catalog, props/slots/events, overlay mechanism, and Ionic interaction patterns.
- **`mobile-ionic`** owns placement/wiring: where files go (`ui-mobile/`, `index.mobile.ts`), routing, tab shell, plugins, "no Nuxt UI in the bundle". Defer all of that to it.
- **`mobile-ionic-theming`** owns colors/surfaces/CSS variables/`:deep()`. Defer styling to it. Use Ionic `color="..."` prop values (which map to the theme), never hardcode hex.
- **`i18n`** owns visible text. **`nuxt-ui`** is desktop-only — never mix with Ionic.
- **Out of scope:** Capacitor native APIs.

## Decision procedure (the core loop)

1. **Name the UI job** in Ionic terms — a list, a form control, a confirm, an overlay, a nav surface, a pull/scroll interaction.
2. **Map the job to a component family** using the catalog below (or `references/ionic-catalog.md`). Prefer a built-in component + its documented pattern over hand-rolled `<div>` markup.
3. **For overlays, pick inline vs. controller** (see rule below).
4. **Verify the exact v9 API** — slots, props, events — against the repo's existing usage first, then Ionic docs / **context7 `@ionic/vue`** if uncertain. Never invent or carry over older-version props.
5. **Write idiomatic markup** matching the repo's house style. Wire completion contracts. Icons from `ionicons/icons`; text via i18n.

When answering a "which component" question, give a **short decision**: the pick + a one-line why + the key slots/props. Not an essay.

## Component catalog by job

- **Page scaffold:** `IonPage` > `IonHeader` > `IonToolbar` (`IonTitle`, `IonButtons slot="start|end"`, `IonBackButton`) > `IonContent`. Collapsible large title = second `IonHeader collapse="condense"` inside `IonContent`.
- **Lists & rows:** `IonList`, `IonItem` (`button`/`detail`), `IonLabel`, `IonNote` (metadata, `slot="end"`), `IonListHeader`, `IonItemGroup` + `IonItemDivider`, `IonAvatar`/`IonThumbnail` (`slot="start"`).
- **Swipe actions:** `IonItemSliding` > `IonItem` + `IonItemOptions` (`side`) > `IonItemOption` (`color="danger"` for destructive; confirm destructive with `alertController`).
- **Reorder:** `IonReorderGroup` (`@ionItemReorder` → `$event.detail.complete()`) + `IonReorder` handles.
- **Cards:** `IonCard` (+ `IonCardHeader`/`IonCardTitle`/`IonCardSubtitle`/`IonCardContent`) — standalone blocks, not dense lists.
- **Form controls:** `IonInput`, `IonTextarea` (`@ionInput`/`v-model`, `label`+`labelPlacement`), `IonSelect`/`IonSelectOption` (`interface="popover|action-sheet|alert"`), `IonToggle`, `IonCheckbox`, `IonRadioGroup`/`IonRadio`, `IonRange`, `IonDatetime` (+ `IonDatetimeButton` in a modal), `IonSearchbar` (`@ionInput` filter). Group in `IonList`; errors via `IonNote color="danger"`.
- **Buttons & actions:** `IonButton` (`fill`, `expand="block"`), `IonFab`+`IonFabButton` (+`IonFabList`), `IonChip`.
- **Nav surfaces:** `IonTabs`/`IonTabBar`/`IonTabButton` (owned by mobile-ionic's `TabsPage.vue`), `IonSegment`/`IonSegmentButton` (in-page switch), `IonBreadcrumbs`, `IonBackButton`.
- **Disclosure:** `IonAccordionGroup` + `IonAccordion` (`slot="header"`/`slot="content"`).
- **Feedback & status:** `IonSpinner` (whole-screen busy), `IonSkeletonText` (list/detail placeholders), `IonProgressBar`, `IonBadge`, `IonText`.
- **Pull/scroll:** `IonRefresher`+`IonRefresherContent` (`@ionRefresh` → `$event.target.complete()`); `IonInfiniteScroll`+`IonInfiniteScrollContent` (`@ionInfinite` → append, `.complete()`, set `disabled` when exhausted).
- **Layout (sparingly):** `IonGrid`/`IonRow`/`IonCol`.

## Overlays: inline vs. controller

- **Inline (`v-model:is-open`)** — `IonModal`, `IonPopover`: content is a page template (form, detail sheet). **Repo default** — `IonModal` with a `presenting-element` prop for iOS card presentation. Bottom sheet = `IonModal` + `:breakpoints` + `:initial-breakpoint`.
- **Imperative controller** — `toastController` (transient feedback — repo standard for success/error), `alertController` (confirms, destructive), `actionSheetController` (short contextual action list from the bottom), `loadingController` (blocking spinner), `modalController`/`popoverController` (created programmatically without a slot). Always `await`; always dismiss.
- **Rule:** template-driven & reusable → inline; fire-and-forget or created in a handler → controller. Match the repo (`toastController`/`alertController` are the house style).

## Interaction primitives

- **Lifecycle:** use `onIonViewWillEnter`/`DidEnter`/`WillLeave`/`DidLeave`, not just `onMounted` — Ionic keeps pages alive in the stack, so a page is *re-entered* without remounting. Refresh data on `ionViewWillEnter`.
- **Gestures:** `createGesture({...})` for custom drag/swipe beyond `IonItemSliding` — prefer the built-in component when one exists.
- **Animations:** `createAnimation()` for custom transitions; overlays animate correctly by default.
- **Platform modes:** Ionic renders `ios` or `md` per platform. Don't hardcode platform spacing; let mode drive it, test both. Component defaults (e.g. `IonSelect` interface) can differ by mode.

## Guardrails

- Verify props/slots/events against **v9** (repo usage first, then context7 `@ionic/vue`) — never guess or reuse older-version APIs.
- Prefer a built-in component + its documented pattern over hand-rolled markup.
- Wire completion contracts: `IonRefresher`/`IonInfiniteScroll` → `.complete()`; `IonReorderGroup` → `$event.detail.complete()`.
- Icons only from `ionicons/icons` (never Lucide). Text only via i18n. Colors only via Ionic `color` props / mobile-ionic-theming. Placement/routing only via mobile-ionic.
- When companion to a mobile-ionic build, produce markup that drops into the target `ui-mobile/` screen and passes `bun run type-check` + `bun lint`.

## Canonical in-repo usage (house style — read before writing new patterns)

- Lists + swipe + skeleton + toast/alert: `src/pages/clients/ui-mobile/ClientsMobilePage.vue`, `ClientDetailMobilePage.vue`.
- Inline `IonModal` feature with `presenting-element`: `src/features/client-form/ui-mobile/ClientFormMobile.vue`.
- Tab shell (`IonTabs`/`IonTabBar`): `src/app-mobile/ui/TabsPage.vue`.
- Segments / selects / toggles / FAB / reorder: grep `src/pages/*/ui-mobile` and `src/features/*/ui-mobile` for the specific `Ion*` tag.

See `references/ionic-catalog.md` for the compact job→component lookup and the overlay rule.
