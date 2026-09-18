# Ionic (@ionic/vue v9) — component catalog & overlay rule

Compact lookup for picking the right Ionic component. Verify exact props/slots/events against repo usage or context7 `@ionic/vue` (v9) before writing.

## Job → component

| UI job | Reach for | Key notes |
|---|---|---|
| Page scaffold | `IonPage` > `IonHeader` > `IonToolbar` > `IonContent` | Toolbar slots: `IonTitle`, `IonButtons slot="start\|end"`, `IonBackButton`. Large title: 2nd `IonHeader collapse="condense"` inside content. |
| List of rows | `IonList` + `IonItem` (+ `IonLabel`, `IonNote`) | `IonItem` `button`/`detail`; metadata via `IonNote slot="end"`; sections via `IonListHeader` / `IonItemGroup`+`IonItemDivider`. |
| Row leading media | `IonAvatar` / `IonThumbnail` `slot="start"` | |
| Swipe actions | `IonItemSliding` > `IonItem` + `IonItemOptions side` > `IonItemOption` | `color="danger"` destructive → confirm with `alertController`. |
| Drag reorder | `IonReorderGroup` + `IonReorder` | `@ionItemReorder` → `$event.detail.complete()`. |
| Standalone content block | `IonCard` (+ Header/Title/Subtitle/Content) | Not for dense lists. |
| Text input | `IonInput` / `IonTextarea` | `v-model` / `@ionInput`; `label` + `labelPlacement`. |
| Pick from options | `IonSelect` / `IonSelectOption` | `interface="popover\|action-sheet\|alert"`. |
| On/off | `IonToggle` / `IonCheckbox` | |
| One-of-many | `IonRadioGroup` / `IonRadio` | |
| Numeric slider | `IonRange` | |
| Date/time | `IonDatetime` (+ `IonDatetimeButton` in a modal) | |
| Search / filter | `IonSearchbar` | `@ionInput` to filter. |
| Field error | `IonNote color="danger"` | |
| Button | `IonButton` | `fill="clear\|outline\|solid"`, `expand="block"`. |
| Floating action | `IonFab` + `IonFabButton` (+ `IonFabList`) | Speed-dial via `IonFabList`. |
| Tag/pill | `IonChip` | |
| Bottom tabs | `IonTabs`/`IonTabBar`/`IonTabButton` | Owned by mobile-ionic `TabsPage.vue`. |
| In-page view switch | `IonSegment` / `IonSegmentButton` | `v-model` + `@ionChange`. |
| Trail | `IonBreadcrumbs` | |
| Expand/collapse sections | `IonAccordionGroup` + `IonAccordion` | Slots `header` / `content`. |
| Whole-screen busy | `IonSpinner` | |
| List/detail placeholder | `IonSkeletonText` | |
| Determinate/indeterminate progress | `IonProgressBar` | |
| Count / status pill | `IonBadge` | |
| Pull-to-refresh | `IonRefresher` + `IonRefresherContent` | First child of `IonContent`; `@ionRefresh` → `$event.target.complete()`. |
| Infinite scroll / paging | `IonInfiniteScroll` + `IonInfiniteScrollContent` | `@ionInfinite` → append + `.complete()`; set `disabled` when exhausted. |
| Explicit grid layout | `IonGrid`/`IonRow`/`IonCol` | Use sparingly; lists/cards usually suffice. |

## Overlays: inline vs. controller

**Inline component (`v-model:is-open`)** — `IonModal`, `IonPopover`. Use when content is a page template (form, detail sheet). Repo default: `IonModal` with a `presenting-element` prop (iOS card). Bottom sheet = `IonModal` + `:breakpoints` + `:initial-breakpoint`.

**Imperative controller** — always `await`, always dismiss:
- `toastController` — transient feedback (repo standard for success/error).
- `alertController` — confirms, destructive (`role: 'destructive'`).
- `actionSheetController` — short list of contextual actions from the bottom.
- `loadingController` — blocking spinner.
- `modalController` / `popoverController` — created programmatically without a slot.

**Rule:** template-driven & reusable → inline; fire-and-forget or created in a handler → controller.

## Interaction primitives

- **Lifecycle:** `onIonViewWillEnter` / `DidEnter` / `WillLeave` / `DidLeave` — pages stay alive in the stack, so they re-enter without remounting. Refresh data on `ionViewWillEnter`, not only `onMounted`.
- **Gestures:** `createGesture({...})` for custom drag/swipe beyond `IonItemSliding`.
- **Animations:** `createAnimation()` for custom transitions.
- **Platform modes:** renders `ios` or `md`; don't hardcode platform spacing, test both. Defaults (e.g. `IonSelect` interface) can differ by mode.

## Non-negotiables

- Icons from `ionicons/icons` (never Lucide). Text via i18n. Colors via Ionic `color` props / mobile-ionic-theming (no hardcoded hex).
- Prefer built-in component + documented pattern over hand-rolled markup.
- Verify v9 API before writing; never carry over v6/v7 props.
